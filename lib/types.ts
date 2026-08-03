export type Candidato = {
  id: string;
  nome: string | null;
  partido: string | null;
  cargo: string | null;
  estado: string | null;
  municipio: string | null;
  criado_em: string | null;
};

export type Campanha = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  candidato_id: string | null;
  url_formulario: string | null;
  ativa: boolean | null;
  inicio_em: string | null;
  fim_em: string | null;
  criado_em: string | null;
  id_planilha: string | null;
  assinaturas_meta: number | null;
  texto_form: string | null;
  texto_dot: string | null;
  destaque_primario: string | null;
  destaque_secundario: string | null;
  cor_destaque: string | null;
};

export type Assinatura = {
  id: string;
  campanha_id: string;
  nome_assinante: string | null;
  numero_assinante: string | null;
  email_assinante: string | null;
  endereco_assinante: string | null;
  n_assinante: number | null;
  complemento_assinante: string | null;
  cidade_assinante: string | null;
  cep_assinante: string | null;
  estado_assinante: string | null;
  ip_origem: string | null;
  assinado_em: string | null;
};
