using adm.Models;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Mvc;

public class HomeController : Controller
{
    private readonly HttpClient _http = SupabaseConfig.Cliente;
    private readonly string _url = SupabaseConfig.BaseUrl + "/rest/v1/";

    public async Task<ActionResult> Index()
    {
        var responseCampanhas = await _http.GetStringAsync(_url + "campanhas?select=*");
        var responseCandidatos = await _http.GetStringAsync(_url + "candidatos?select=*");
        var responseAssinaturas = await _http.GetStringAsync(_url + "assinaturas?select=*");

        ViewBag.Campanhas = JsonConvert.DeserializeObject<List<Campanha>>(responseCampanhas);
        ViewBag.Assinaturas = JsonConvert.DeserializeObject<List<Assinatura>>(responseAssinaturas);
        ViewBag.Candidatos = JsonConvert.DeserializeObject<List<Candidato>>(responseCandidatos);

        return View();
    }
}