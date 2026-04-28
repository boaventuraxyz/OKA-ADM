using adm.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace adm.Controllers
{
    public class AssinaturaController : Controller
    {
        private readonly HttpClient _http = SupabaseConfig.Cliente;
        private readonly string _url = SupabaseConfig.BaseUrl + "/rest/v1/assinaturas";
        private readonly string _urlCamp = SupabaseConfig.BaseUrl + "/rest/v1/campanhas";

        // Lista assinaturas de uma campanha específica
        public async Task<ActionResult> Index(Guid campanhaId)
        {
            var response = await _http.GetStringAsync(
                $"{_url}?campanha_id=eq.{campanhaId}&select=*&order=assinado_em.desc");

            var assinaturas = JsonConvert.DeserializeObject<List<Assinatura>>(response);

            // Busca nome da campanha para exibir no título
            var campResp = await _http.GetStringAsync($"{_urlCamp}?id=eq.{campanhaId}&select=titulo");
            var campanhas = JsonConvert.DeserializeObject<List<Campanha>>(campResp);

            ViewBag.CampanhaId = campanhaId;
            ViewBag.CampanhaTitulo = campanhas?.Count > 0 ? campanhas[0].Titulo : "";

            return View(assinaturas);
        }

        // Detalhe de uma assinatura
        public async Task<ActionResult> Details(Guid id)
        {
            var response = await _http.GetStringAsync($"{_url}?id=eq.{id}&select=*");
            var lista = JsonConvert.DeserializeObject<List<Assinatura>>(response);

            if (lista == null || lista.Count == 0) return HttpNotFound();
            return View(lista[0]);
        }


        // Delete
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Delete(Guid id, Guid campanhaId)
        {
            await _http.DeleteAsync($"{_url}?id=eq.{id}");
            return RedirectToAction("Index", new { campanhaId });
        }
    }
}