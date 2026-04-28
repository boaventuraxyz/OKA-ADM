using adm.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace adm.Controllers
{
    public class CampanhaController : Controller
    {
        private readonly HttpClient _http = SupabaseConfig.Cliente;
        private readonly string _url = SupabaseConfig.BaseUrl + "/rest/v1/campanhas";
        private readonly string _urlCand = SupabaseConfig.BaseUrl + "/rest/v1/candidatos";
        private readonly string _urlAssinaturas = SupabaseConfig.BaseUrl + "/rest/v1/assinaturas";

        private async Task CarregarCandidatos()
        {
            var response = await _http.GetStringAsync(_urlCand + "?select=id,nome,partido&order=nome.asc");
            var candidatos = JsonConvert.DeserializeObject<List<Candidato>>(response);
            ViewBag.Candidatos = candidatos;
        }

        // GET: /Campanha
        public async Task<ActionResult> Index()
        {
            var responseCamp = await _http.GetStringAsync(_url + "?select=*&order=criado_em.desc");
            var campanhas = JsonConvert.DeserializeObject<List<Campanha>>(responseCamp);

            await CarregarCandidatos();

            return View(campanhas);
        }

        // GET: /Campanha/Create
        public async Task<ActionResult> Create()
        {
            await CarregarCandidatos();
            return View(new Campanha { Ativa = true });
        }

        // POST: /Campanha/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Create(Campanha campanha)
        {
            var payload = new
            {
                titulo = campanha.Titulo,
                descricao = campanha.Descricao,
                candidato_id = campanha.CandidatoId,
                url_formulario = campanha.UrlFormulario,
                ativa = campanha.Ativa ?? true,
                inicio_em = campanha.InicioEm,
                fim_em = campanha.FimEm,
                id_planilha = campanha.IdPlanilha,
                assinaturas_meta = campanha.AssinaturaMeta,
                texto_form = campanha.TextoForm
            };

            var json = JsonConvert.SerializeObject(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            await _http.PostAsync(_url, content);

            return RedirectToAction("Index");
        }

        [HttpGet]
        public async Task<ActionResult> BaixarAssinaturas(Guid id)
        {
            try
            {
                var campanhaResponse = await _http.GetStringAsync($"{_url}?id=eq.{id}&select=*");
                var campanha = JsonConvert.DeserializeObject<List<Campanha>>(campanhaResponse).FirstOrDefault();

                if (campanha == null)
                    return new HttpStatusCodeResult(404, "Campanha não encontrada.");

                var responseAssinatura = await _http.GetStringAsync($"{_urlAssinaturas}?campanha_id=eq.{campanha.Id}&select=*&order=assinado_em.desc");
                var assinaturas = JsonConvert.DeserializeObject<List<Assinatura>>(responseAssinatura);

                if (assinaturas == null || !assinaturas.Any())
                    return new HttpStatusCodeResult(404, "Nenhuma assinatura encontrada.");

                var sb = new StringBuilder();
                sb.AppendLine("Nome;Numero;Email;Endereco;Numero End.;Complemento;Cidade;CEP;Estado;IP Origem;Data");

                foreach (var a in assinaturas)
                {
                    sb.AppendLine(string.Join(";", new[]
                    {
                EscaparCsv(a.NomeAssinante),
                EscaparCsv(a.NumeroAssinante),
                EscaparCsv(a.EmailAssinante),
                EscaparCsv(a.EnderecoAssinante),
                a.NAssinante.HasValue ? a.NAssinante.Value.ToString() : "",
                EscaparCsv(a.ComplementoAssinante),
                EscaparCsv(a.CidadeAssinante),
                EscaparCsv(a.CepAssinante),
                EscaparCsv(a.EstadoAssinante),
                EscaparCsv(a.IpOrigem),
                a.AssinadoEm.HasValue
                    ? a.AssinadoEm.Value.ToLocalTime().ToString("dd/MM/yyyy HH:mm:ss")
                    : ""
            }));
                }

                var preamble = Encoding.UTF8.GetPreamble();
                var conteudo = Encoding.UTF8.GetBytes(sb.ToString());
                var bytes = preamble.Concat(conteudo).ToArray();

                // Sanitiza o título para nome de arquivo
                var tituloSanitizado = string.Concat(campanha.Titulo
                    .Where(ch => !Path.GetInvalidFileNameChars().Contains(ch)));

                return File(bytes, "text/csv; charset=utf-8", $"Resultado_{tituloSanitizado}.csv");
            }
            catch (Exception ex)
            {
                return new HttpStatusCodeResult(500, "Erro ao gerar arquivo: " + ex.Message);
            }
        }
        private string EscaparCsv(string valor)
        {
            if (string.IsNullOrEmpty(valor)) return "";
            if (valor.Contains(";") || valor.Contains("\"") || valor.Contains("\n") || valor.Contains("\r"))
                return "\"" + valor.Replace("\"", "\"\"") + "\"";
            return valor;
        }

        public async Task<ActionResult> Edit(Guid id)
        {
            var response = await _http.GetStringAsync($"{_url}?id=eq.{id}&select=*");
            var lista = JsonConvert.DeserializeObject<List<Campanha>>(response);

            if (lista == null || lista.Count == 0) return HttpNotFound();

            await CarregarCandidatos();

            return View(lista[0]);
        }

        // POST: /Campanha/Edit
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Edit(Campanha campanha)
        {
            var payload = new
            {
                titulo = campanha.Titulo,
                descricao = campanha.Descricao,
                candidato_id = campanha.CandidatoId,
                url_formulario = campanha.UrlFormulario,
                ativa = campanha.Ativa,
                inicio_em = campanha.InicioEm,
                fim_em = campanha.FimEm,
                id_planilha = campanha.IdPlanilha,
                assinaturas_meta = campanha.AssinaturaMeta,
                texto_form = campanha.TextoForm

            };

            var json = JsonConvert.SerializeObject(payload,
                            new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore });
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var request = new HttpRequestMessage(new HttpMethod("PATCH"),
                            $"{_url}?id=eq.{campanha.Id}")
            { Content = content };

            await _http.SendAsync(request);
            return RedirectToAction("Index");
        }

        // POST: /Campanha/Delete
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Delete(Guid id)
        {
            await _http.DeleteAsync($"{_url}?id=eq.{id}");
            return RedirectToAction("Index");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> ToggleAtiva(Guid id)
        {
            // Busca o status atual
            var response = await _http.GetStringAsync($"{_url}?id=eq.{id}&select=ativa");
            var lista = JsonConvert.DeserializeObject<List<Campanha>>(response);

            if (lista == null || lista.Count == 0) return HttpNotFound();

            var novoStatus = !(lista[0].Ativa ?? false);

            var payload = new { ativa = novoStatus };
            var json = JsonConvert.SerializeObject(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var request = new HttpRequestMessage(new HttpMethod("PATCH"),
                            $"{_url}?id=eq.{id}")
            { Content = content };

            await _http.SendAsync(request);
            return RedirectToAction("Index");
        }


        [HttpPost]
        [ValidateAntiForgeryToken]
        [ValidateInput(false)] // permite HTML no input
        public async Task<ActionResult> UpdateHtml(string idCampanha, string html)
        {
            if (string.IsNullOrWhiteSpace(idCampanha))
                return new HttpStatusCodeResult(400, "idCampanha obrigatório");

            // Codifica o HTML em Base64 (mesmo formato usado na leitura)
            var htmlBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(html ?? ""));

            // Monta o payload PATCH para o Supabase
            var payload = new { html = htmlBase64 };
            var json = JsonConvert.SerializeObject(payload);

            var request = new HttpRequestMessage(new HttpMethod("PATCH"), $"{_url}?id=eq.{idCampanha}")
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            // Pede para o Supabase retornar a representação atualizada (opcional)
            request.Headers.Add("Prefer", "return=representation");
            var response = await _http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var erro = await response.Content.ReadAsStringAsync();
                TempData["Erro"] = "Falha ao atualizar HTML: " + erro;
            }
            else
            {
                TempData["Ok"] = "HTML atualizado com sucesso.";
            }

            return RedirectToAction("Index", "Campanha");
        }
    }
}