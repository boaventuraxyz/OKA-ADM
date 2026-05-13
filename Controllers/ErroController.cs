using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace adm.Controllers
{
    public class ErroController : Controller
    {
        public ActionResult TooManyRequests()
        {
            Response.StatusCode = 429;
            return View();
        }
    }
}