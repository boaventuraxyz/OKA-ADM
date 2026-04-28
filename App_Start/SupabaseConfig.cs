using System;
using System.Configuration;
using System.Net.Http;
using System.Net.Http.Headers;

public class SupabaseConfig
{
    public static HttpClient Cliente { get; private set; }
    public static string BaseUrl { get; private set; }

    public static void Inicializar()
    {
        BaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")
                  ?? ConfigurationManager.AppSettings["SupabaseUrl"];

        var key = Environment.GetEnvironmentVariable("SUPABASE_KEY")
                  ?? ConfigurationManager.AppSettings["SupabaseKey"];

        if (string.IsNullOrEmpty(BaseUrl) || string.IsNullOrEmpty(key))
            throw new Exception("Credenciais do Supabase não configuradas.");

        Cliente = new HttpClient();
        Cliente.DefaultRequestHeaders.Add("apikey", key);
        Cliente.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", key);
        Cliente.DefaultRequestHeaders.Accept
            .Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }
}