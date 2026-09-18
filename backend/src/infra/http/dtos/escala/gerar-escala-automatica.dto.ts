import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';

// DTO da UC05 — Gerar Escala Automaticamente.
//
// O gestor informa o período e o posto. A grade de horários (quais
// turnos o posto abre e de quanta gente precisa em cada dia da semana)
// vem do cadastro do posto, não da requisição: é atributo do lugar, não
// escolha de quem gera.
export class GerarEscalaAutomaticaDto {
  @IsDateString({}, { message: 'dataInicio deve ser uma data válida (AAAA-MM-DD).' })
  dataInicio: string;

  @IsDateString({}, { message: 'dataFim deve ser uma data válida (AAAA-MM-DD).' })
  dataFim: string;

  @IsInt({ message: 'postoId deve ser um número inteiro.' })
  @IsPositive({ message: 'postoId deve ser um número positivo.' })
  postoId: number;

  @IsOptional()
  @IsInt({ message: 'regraId deve ser um número inteiro.' })
  @IsPositive({ message: 'regraId deve ser um número positivo.' })
  regraId?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'funcionarioIds, se informado, não pode ser vazio.' })
  @IsInt({ each: true, message: 'funcionarioIds deve conter apenas números inteiros.' })
  funcionarioIds?: number[];

  /**
   * Planeja e devolve o resultado SEM gravar nada.
   *
   * Existe porque planejar deixou de custar caro: a decisão inteira
   * acontece em memória, então rodar sem gravar é o mesmo caminho menos
   * o último passo. Serve pro gestor comparar 5x1 com 6x1, ou ver o
   * efeito de reduzir a demanda de domingo, antes de escolher — em vez
   * de gerar, não gostar, apagar a escala e tentar de novo.
   */
  @IsOptional()
  @IsBoolean()
  simular?: boolean;

  /**
   * Permite que um titular cubra turno que não é o dele.
   *
   * Desligado por padrão, porque as escalas reais mostram cada pessoa no
   * mesmo horário o mês inteiro. Ligar dá ao motor muito mais saída (em
   * especial pra garantir domingo de folga pra todo mundo), ao custo de
   * uma escala em que o horário de cada um varia. É decisão do gestor.
   */
  @IsOptional()
  @IsBoolean()
  permitirForaDoPreferido?: boolean;
}
