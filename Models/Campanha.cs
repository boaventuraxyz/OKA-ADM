using System;
using System.Web.Mvc;
using Newtonsoft.Json;

namespace adm.Models
{
    public class Campanha
    {
        [JsonProperty("id")]
        public Guid Id { get; set; }

        [JsonProperty("titulo")]
        public string Titulo { get; set; }

        [JsonProperty("descricao")]
        public string Descricao { get; set; }

        [JsonProperty("candidato_id")]
        public Guid? CandidatoId { get; set; }

        [JsonProperty("url_formulario")]
        public string UrlFormulario { get; set; }

        [JsonProperty("ativa")]
        public bool? Ativa { get; set; }

        [JsonProperty("inicio_em")]
        public DateTime? InicioEm { get; set; }

        [JsonProperty("fim_em")]
        public DateTime? FimEm { get; set; }

        [JsonProperty("criado_em")]
        public DateTime? CriadoEm { get; set; }

        [JsonProperty("id_planilha")]
        public string IdPlanilha { get; set; }

        [AllowHtml]
        [JsonProperty("html")]
        public string html { get; set; }

        [JsonProperty("assinaturas_meta")]
        public int? AssinaturaMeta { get; set; }

        [JsonProperty("texto_form")]
        public string TextoForm { get; set; }
    }
    public class Assinatura
    {
        [JsonProperty("id")]
        public Guid Id { get; set; }

        [JsonProperty("campanha_id")]
        public Guid CampanhaId { get; set; }

        [JsonProperty("nome_assinante")]
        public string NomeAssinante { get; set; }

        [JsonProperty("numero_assinante")]
        public string NumeroAssinante { get; set; }

        [JsonProperty("email_assinante")]
        public string EmailAssinante { get; set; }

        [JsonProperty("endereco_assinante")]
        public string EnderecoAssinante { get; set; }

        [JsonProperty("n_assinante")]
        public int? NAssinante { get; set; }

        [JsonProperty("complemento_assinante")]
        public string ComplementoAssinante { get; set; }

        [JsonProperty("cidade_assinante")]
        public string CidadeAssinante { get; set; }

        [JsonProperty("cep_assinante")]
        public string CepAssinante { get; set; }

        [JsonProperty("estado_assinante")]
        public string EstadoAssinante { get; set; }

        [JsonProperty("ip_origem")]
        public string IpOrigem { get; set; }

        [JsonProperty("assinado_em")]
        public DateTimeOffset? AssinadoEm { get; set; }

    }
}