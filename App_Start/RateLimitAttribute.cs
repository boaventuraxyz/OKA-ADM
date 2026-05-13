using System;
using System.Collections.Concurrent;
using System.Net;
using System.Web.Mvc;

public class RateLimitAttribute : ActionFilterAttribute
{
    private readonly int _maxRequests;
    private readonly int _windowSeconds;

    // Armazena: chave -> (quantidade, início da janela)
    private static readonly ConcurrentDictionary<string, (int Count, DateTime WindowStart)> _cache
        = new ConcurrentDictionary<string, (int, DateTime)>();

    public RateLimitAttribute(int maxRequests = 10, int windowSeconds = 60)
    {
        _maxRequests = maxRequests;
        _windowSeconds = windowSeconds;
    }

    public override void OnActionExecuting(ActionExecutingContext filterContext)
    {
        var ip = filterContext.HttpContext.Request.UserHostAddress;
        var action = filterContext.ActionDescriptor.ActionName;
        var key = $"{ip}:{action}";
        var now = DateTime.UtcNow;

        _cache.AddOrUpdate(key,
            _ => (1, now),
            (_, existing) =>
            {
                if ((now - existing.WindowStart).TotalSeconds > _windowSeconds)
                    return (1, now);

                return (existing.Count + 1, existing.WindowStart);
            });

        if (_cache[key].Count > _maxRequests)
        {
            filterContext.Result = new RedirectToRouteResult(
                new System.Web.Routing.RouteValueDictionary
                {
                { "controller", "Erro" },
                { "action", "TooManyRequests" }
                });
        }

        base.OnActionExecuting(filterContext);
    }
}