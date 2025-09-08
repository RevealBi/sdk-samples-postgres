namespace RevealSdk.Server.Configuration
{
    public class ServerOptions
    {
        public string Host { get; set; } = "";
        public string Database { get; set; } = "";
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string Schema { get; set; } = "";
        public int Port { get; set; } = 5432;
    }

}
