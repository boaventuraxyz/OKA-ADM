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
    public class CandidatoController : Controller
    {
        private readonly HttpClient _http = SupabaseConfig.Cliente;
        private readonly string _url = SupabaseConfig.BaseUrl + "/rest/v1/candidatos";

        public async Task<ActionResult> Index()
        {
            var response = await _http.GetStringAsync(_url + "?select=*&order=criado_em.desc");
            var candidatos = JsonConvert.DeserializeObject<List<Candidato>>(response);
            return View(candidatos);
        }

        public ActionResult Create() => View(new Candidato());

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Create(Candidato candidato)
        {
            var payload = new
            {
                nome = candidato.Nome,
                partido = candidato.Partido,
                cargo = candidato.Cargo,
                estado = candidato.Estado,
                municipio = candidato.Municipio
            };

            var json = JsonConvert.SerializeObject(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            await _http.PostAsync(_url, content);

            return RedirectToAction("Index");
        }

        public async Task<ActionResult> Edit(Guid id)
        {
            var response = await _http.GetStringAsync($"{_url}?id=eq.{id}&select=*");
            var lista = JsonConvert.DeserializeObject<List<Candidato>>(response);

            if (lista == null || lista.Count == 0) return HttpNotFound();
            return View(lista[0]);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Edit(Candidato candidato)
        {
            var payload = new
            {
                nome = candidato.Nome,
                partido = candidato.Partido,
                cargo = candidato.Cargo,
                estado = candidato.Estado,
                municipio = candidato.Municipio
            };

            var json = JsonConvert.SerializeObject(payload,
                            new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore });
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var request = new HttpRequestMessage(new HttpMethod("PATCH"),
                            $"{_url}?id=eq.{candidato.Id}")
            { Content = content };

            await _http.SendAsync(request);
            return RedirectToAction("Index");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Delete(Guid id)
        {
            await _http.DeleteAsync($"{_url}?id=eq.{id}");
            return RedirectToAction("Index");
        }

    }
}