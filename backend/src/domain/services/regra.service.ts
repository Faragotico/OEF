import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RegraRepository } from '../repositories/regra.repository';
import { CreateRegraDto } from 'src/infra/http/dtos/regra/create-regra.dto';
import { UpdateRegraDto } from 'src/infra/http/dtos/regra/update-regra.dto';

// O service é o CÉREBRO: aplica as regras de negócio e decide o que
// fazer. Não sabe o que é requisição HTTP (controller) nem como o
// banco funciona (repository).
@Injectable()
export class RegraService {
  constructor(private readonly repository: RegraRepository) {}

  // NOVO em relação ao PostoTrabalho: no schema há @@unique([tipo, valor]).
  // Ou seja, não pode existir duas regras com o MESMO tipo E o MESMO
  // valor. Quando o banco barra isso, o Prisma lança um erro de código
  // P2002. Aqui traduzimos esse erro técnico num 409 Conflict com
  // mensagem clara.
  //
  // (Empresa e Funcionário resolvem duplicidade com uma consulta prévia,
  //  antes de salvar. Aqui uso o outro caminho: deixo o banco barrar e
  //  trato o erro. Os dois são válidos; este evita uma consulta extra.)
  private handleUniqueError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Já existe uma regra com esse tipo e valor.');
    }
    throw error;
  }

  async create(dto: CreateRegraDto) {
    await this.ensureTipoUnicoDisponivel(dto.tipo);
    // A primeira regra de um tipo que pode ter várias ('escala') já
    // nasce marcada como padrão — sem isso, o gestor teria que
    // lembrar de ir marcar manualmente antes de gerar qualquer coisa.
    const jaTemPadrao = dto.tipo === 'escala' ? await this.repository.existePadrao(dto.tipo) : true;
    try {
      return await this.repository.create({ ...dto, padrao: !jaTemPadrao });
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  findAll() {
    return this.repository.findAll();
  }

  /**
   * Busca uma regra pelo id.
   * @throws NotFoundException se não existir.
   */
  async findOne(id: number) {
    const regra = await this.repository.findById(id);
    if (!regra) {
      throw new NotFoundException(`Regra com id ${id} não encontrada.`);
    }
    return regra;
  }

  async update(id: number, dto: UpdateRegraDto) {
    const atual = await this.findOne(id); // reaproveita a checagem de existência
    const tipoEfetivo = dto.tipo ?? atual.tipo;
    await this.ensureTipoUnicoDisponivel(tipoEfetivo, id);
    try {
      return await this.repository.update(id, dto);
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  /**
   * Marca esta regra como o padrão do seu tipo — a que a geração usa
   * quando ninguém escolhe regraId explicitamente. Só faz sentido pra
   * 'escala': os outros tipos já são únicos por natureza, não têm o
   * que escolher entre duas.
   * @throws NotFoundException se não existir.
   * @throws ConflictException se o tipo não admite mais de uma regra.
   */
  async marcarComoPadrao(id: number) {
    const regra = await this.findOne(id);
    if (regra.tipo !== 'escala') {
      throw new ConflictException(
        `"padrão" só faz sentido pro tipo "escala" — "${regra.tipo}" já vale pro sistema inteiro sozinho, não tem outra regra do mesmo tipo pra escolher entre.`,
      );
    }
    return this.repository.marcarComoPadrao(id, regra.tipo);
  }

  // 'escala' pode ter várias regras — cada padrão de rodízio (5x1, 6x1...)
  // é uma regra separada, e o gestor escolhe qual usar em cada geração.
  // Os outros tipos ('carga_horaria_semanal', 'intervalo_interjornada')
  // são configuração GLOBAL: valem pro sistema inteiro, sem escolha
  // nenhuma na hora de gerar uma escala. Por isso só pode existir UMA de
  // cada — sem essa checagem, o RegrasTrabalhistasService.buscarValorRegra
  // pegaria a primeira que o banco devolvesse (ordem não garantida, e
  // invisível pra quem cadastrou), que era exatamente a confusão que
  // motivou este rework: duas regras "carga_horaria_semanal" concorrentes
  // e nenhuma pista de qual delas realmente valia na geração automática.
  private async ensureTipoUnicoDisponivel(tipo: string, ignorarId?: number) {
    if (tipo === 'escala') return;
    const existente = await this.repository.findByTipo(tipo);
    if (existente && existente.id !== ignorarId) {
      throw new ConflictException(
        `Já existe uma configuração cadastrada para "${tipo}" (regra #${existente.id}). Esse tipo vale pro sistema inteiro — edite a regra existente em vez de criar outra, senão a geração automática não saberia qual das duas usar.`,
      );
    }
  }

  /**
   * Exclui uma regra.
   * @throws ConflictException se houver escalas vinculadas à regra.
   */
  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.repository.delete(id);
    } catch (error) {
      // Aqui o P2003 significa: o onDelete: Restrict do schema está
      // impedindo apagar uma regra que ainda tem escalas vinculadas.
      // Devolvemos 409 (conflito de estado). Mesmo padrão do PostoTrabalho.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Não é possível excluir: existem escalas vinculadas a esta regra.',
        );
      }
      throw error;
    }
  }
}
