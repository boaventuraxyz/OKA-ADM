using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web.Mvc;
using adm.Models;
using Newtonsoft.Json;

namespace adm.Controllers
{
    public class CampanhaController : Controller
    {
        private readonly HttpClient _http = SupabaseConfig.Cliente;
        private readonly string _url = SupabaseConfig.BaseUrl + "/rest/v1/campanhas";
        private readonly string _urlCand = SupabaseConfig.BaseUrl + "/rest/v1/candidatos";

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
                html = Convert.ToBase64String(Encoding.UTF8.GetBytes(campanha.html)),
                assinaturas_meta = campanha.AssinaturaMeta,
                texto_form = campanha.TextoForm
            };

            var json = JsonConvert.SerializeObject(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            await _http.PostAsync(_url, content);

            return RedirectToAction("Index");
        }

        // GET: /Campanha/Edit/id
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