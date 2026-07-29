using System.Configuration;
using System.Web.Mvc;
using System.Web.Security;

namespace adm.Controllers
{
    [RateLimit(maxRequests: 5, windowSeconds: 120)]
    public class LoginController : Controller
    {
        // GET: /Login
        public ActionResult Index()
        {
            if (Request.IsAuthenticated)
                return RedirectToAction("Index", "Home");

            return View();
        }

        // POST: /Login
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Index(string senha)
        {
            var senhaCorreta = System.Environment.GetEnvironmentVariable("SENHA_ADMIN")
                               ?? ConfigurationManager.AppSettings["SenhaAdmin"];

            if (string.IsNullOrWhiteSpace(senhaCorreta))
            {
                ViewBag.Erro = "Senha de admin não configurada.";
                return View();
            }

            if (senha == senhaCorreta)
            {
                FormsAuthentication.SetAuthCookie("admin", false);
                return RedirectToAction("Index", "Home");
            }

            ViewBag.Erro = "Senha incorreta.";
            return View();
        }

        // POST: /Login/Sair
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Sair()
        {
            FormsAuthentication.SignOut();
            return RedirectToAction("Index", "Login");
        }
    }
}
