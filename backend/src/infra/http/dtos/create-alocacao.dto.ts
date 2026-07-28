import { IsBoolean, IsDateString, IsInt, IsOptional } from 'class-validator';

// DTO de criação da Alocacao.
// Lembre: o DTO é o "contrato" do que o CLIENTE manda pela internet.
// Ele valida os dados ANTES de chegarem no banco. Nada de id aqui —
// o id é gerado pelo banco (@default(autoincrement()) no schema).
//
// A novidade em relação ao Funcionario são os campos *Id. Eles são os
// "ponteiros" pras outras tabelas (funcionário, escala, turno). Aqui no
// DTO eles são só números inteiros — a checagem de "esse id existe de
// verdade?" NÃO é papel do DTO, é do service (regra de negócio).
export class CreateAlocacaoDto {
  // Vem como texto ISO no JSON, ex: "2026-07-25".
  // @IsDateString garante que é uma data válida (recusa "abc" ou "2026-99-99").
  @IsDateString(
    {},
    { message: 'data deve ser uma data válida no formato AAAA-MM-DD.' },
  )
  data: string;

  @IsInt({ message: 'funcionarioId deve ser um número inteiro.' })
  funcionarioId: number;

  @IsInt({ message: 'escalaId deve ser um número inteiro.' })
  escalaId: number;

  @IsInt({ message: 'turnoId deve ser um número inteiro.' })
  turnoId: number;

  // Opcional: se o cliente não mandar, o banco preenche false (@default).
  // Se mandar, precisa ser booleano. Mesma ideia do status? no Funcionario.
  @IsOptional()
  @IsBoolean()
  ehSubstituido?: boolean;
}
