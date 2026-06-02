using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace adm.Controllers
{
    [RateLimit(maxRequests: 10, windowSeconds: 60)]
    public class GrupoWppController : Controller
    {
        // GET: Grupo
        public ActionResult Index()
        {
            return View();
        }
    }
}