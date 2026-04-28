using adm.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;

namespace adm.Controllers
{
    public class FormularioController : Controller
    {
        private readonly HttpClient _http = SupabaseConfig.Cliente;
        private readonly string _url = SupabaseConfig.BaseUrl + "/rest/v1/campanhas";
        private readonly string _urlAss = SupabaseConfig.BaseUrl + "/rest/v1/assinaturas";


        // GET: Formulario
        public async Task<ActionResult> Index(string idCampanha)
        {
            if (string.IsNullOrWhiteSpace(idCampanha))
                return new HttpStatusCodeResult(400, "idCampanha obrigatório");

            var campResp = await _http.GetStringAsync($"{_url}?id=eq.{idCampanha}&select=*");
            var campRespAss = await _http.GetStringAsync($"{_urlAss}?campanha_id=eq.{idCampanha}&select=*");
            var campanhas = JsonConvert.DeserializeObject<List<Campanha>>(campResp).FirstOrDefault();
            var assinaturas = JsonConvert.DeserializeObject<List<Assinatura>>(campRespAss);
            ViewBag.Campanha = campanhas;
            ViewBag.Assinaturas = assinaturas;
            ViewData["htmlDecod"] = Encoding.UTF8.GetString(Convert.FromBase64String(campanhas.html));
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Create(Assinatura assinatura)
        {
            var payload = new
            {
                campanha_id = assinatura.CampanhaId,
                nome_assinante = assinatura.NomeAssinante,
                numero_assinante = assinatura.NumeroAssinante,
                email_assinante = assinatura.EmailAssinante,
                endereco_assinante = assinatura.EnderecoAssinante,
                n_assinante = assinatura.NAssinante,
                complemento_assinante = assinatura.ComplementoAssinante,
                cidade_assinante = assinatura.CidadeAssinante,
                cep_assinante = assinatura.CepAssinante,
                estado_assinante = assinatura.EstadoAssinante,
                ip_origem = Request.UserHostAddress,
                assinado_em = DateTimeOffset.Now
            };

            var json = JsonConvert.SerializeObject(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _http.PostAsync(_urlAss, content);

            if (!response.IsSuccessStatusCode)
            {
                return Json(new { sucesso = false, erro = "Erro ao salvar" });
            }

            return Json(new { sucesso = true });
        }
    }
}