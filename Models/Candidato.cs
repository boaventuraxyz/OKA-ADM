using Newtonsoft.Json;
using System;

namespace adm.Models
{
    public class Candidato
{
    [JsonProperty("id")]
    public Guid Id { get; set; }

    [JsonProperty("nome")]
    public string Nome { get; set; }

    [JsonProperty("partido")]
    public string Partido { get; set; }

    [JsonProperty("cargo")]
    public string Cargo { get; set; }

    [JsonProperty("estado")]
    public string Estado { get; set; }

    [JsonProperty("municipio")]
    public string Municipio { get; set; }

    [JsonProperty("criado_em")]
    public DateTime? CriadoEm { get; set; }
}
}