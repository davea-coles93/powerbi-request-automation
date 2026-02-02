using System;
using System.IO;
using Microsoft.AnalysisServices.Tabular;

namespace TmslExecutor
{
    class Program
    {
        static int Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.Error.WriteLine("Usage: TmslExecutor <command> [args...]");
                Console.Error.WriteLine("");
                Console.Error.WriteLine("Deployment Commands:");
                Console.Error.WriteLine("  deploy <model-path> <server> <database> <access-token>");
                Console.Error.WriteLine("    Deploy TMDL model to Azure Analysis Services");
                Console.Error.WriteLine("");
                Console.Error.WriteLine("  delete-database <server> <database> <access-token>");
                Console.Error.WriteLine("    Delete database from Azure Analysis Services");
                Console.Error.WriteLine("");
                Console.Error.WriteLine("Examples:");
                Console.Error.WriteLine("  deploy ./model.SemanticModel asazure://server.asazure.windows.net/myserver testdb eyJ0eXAi...");
                Console.Error.WriteLine("  delete-database asazure://server.asazure.windows.net/myserver testdb eyJ0eXAi...");
                return 1;
            }

            string command = args[0].ToLower();

            try
            {
                // Execute the command
                switch (command)
                {
                    case "deploy":
                        if (args.Length != 5)
                        {
                            Console.Error.WriteLine("Error: deploy requires 4 arguments: <model-path> <server> <database> <access-token>");
                            return 1;
                        }
                        return DeployToAAS(args[1], args[2], args[3], args[4]);

                    case "delete-database":
                        if (args.Length != 4)
                        {
                            Console.Error.WriteLine("Error: delete-database requires 3 arguments: <server> <database> <access-token>");
                            return 1;
                        }
                        return DeleteDatabase(args[1], args[2], args[3]);

                    default:
                        Console.Error.WriteLine($"Error: Unknown command: {command}");
                        Console.Error.WriteLine("Run without arguments to see usage.");
                        return 1;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error: {ex.Message}");
                Console.Error.WriteLine($"Stack trace: {ex.StackTrace}");
                return 1;
            }
        }

        static int DeployToAAS(string modelPath, string serverName, string databaseName, string accessToken)
        {
            Console.WriteLine($"Deploying TMDL model to Azure Analysis Services");
            Console.WriteLine($"  Model: {modelPath}");
            Console.WriteLine($"  Server: {serverName}");
            Console.WriteLine($"  Database: {databaseName}");

            // Find the semantic model folder
            string semanticModelPath = FindSemanticModelPath(modelPath);
            if (string.IsNullOrEmpty(semanticModelPath))
            {
                Console.Error.WriteLine($"Error: Could not find semantic model at: {modelPath}");
                return 1;
            }

            Console.WriteLine($"Loading TMDL model from: {semanticModelPath}");

            // Load the model from TMDL files
            var database = TmdlSerializer.DeserializeDatabaseFromFolder(semanticModelPath);
            Console.WriteLine($"✓ Loaded model: {database.Name}");
            Console.WriteLine($"  Tables: {database.Model.Tables.Count}");
            Console.WriteLine($"  Relationships: {database.Model.Relationships.Count}");

            // Set the database name for deployment
            database.Name = databaseName;

            // Connect to AAS server
            Console.WriteLine($"Connecting to AAS server...");
            var server = new Server();

            // Connection string with bearer token
            string connectionString = $"DataSource={serverName};Password={accessToken};";
            server.Connect(connectionString);
            Console.WriteLine($"✓ Connected to: {server.Name}");
            Console.WriteLine($"  Version: {server.Version}");

            try
            {
                // Check if database already exists
                var existingDb = server.Databases.FindByName(databaseName);
                if (existingDb != null)
                {
                    Console.WriteLine($"Database '{databaseName}' already exists. Dropping it first...");
                    existingDb.Drop();
                    Console.WriteLine($"✓ Dropped existing database");
                }

                // Deploy the database
                Console.WriteLine($"Deploying database...");
                server.Databases.Add(database);
                database.Update(Microsoft.AnalysisServices.UpdateOptions.ExpandFull);
                Console.WriteLine($"✓ Database deployed successfully");

                // Verify deployment
                var deployedDb = server.Databases.FindByName(databaseName);
                if (deployedDb != null)
                {
                    Console.WriteLine($"✓ Verified deployment:");
                    Console.WriteLine($"  Database: {deployedDb.Name}");
                    Console.WriteLine($"  Last Updated: {deployedDb.LastUpdate}");
                    Console.WriteLine($"  State: {deployedDb.State}");
                }

                Console.WriteLine("");
                Console.WriteLine("SUCCESS: Model deployed to Azure Analysis Services");
                return 0;
            }
            finally
            {
                server.Disconnect();
            }
        }

        static int DeleteDatabase(string serverName, string databaseName, string accessToken)
        {
            Console.WriteLine($"Deleting database from Azure Analysis Services");
            Console.WriteLine($"  Server: {serverName}");
            Console.WriteLine($"  Database: {databaseName}");

            // Connect to AAS server
            Console.WriteLine($"Connecting to AAS server...");
            var server = new Server();

            // Connection string with bearer token
            string connectionString = $"DataSource={serverName};Password={accessToken};";
            server.Connect(connectionString);
            Console.WriteLine($"✓ Connected to: {server.Name}");

            try
            {
                // Check if database exists
                var existingDb = server.Databases.FindByName(databaseName);
                if (existingDb == null)
                {
                    Console.WriteLine($"Database '{databaseName}' does not exist. Nothing to delete.");
                    return 0;
                }

                // Delete the database
                Console.WriteLine($"Deleting database...");
                existingDb.Drop();
                Console.WriteLine($"✓ Database deleted successfully");

                Console.WriteLine("");
                Console.WriteLine("SUCCESS: Database deleted from Azure Analysis Services");
                return 0;
            }
            finally
            {
                server.Disconnect();
            }
        }

        static string FindSemanticModelPath(string modelPath)
        {
            string semanticModelPath = "";

            // Check if it's a .pbip file
            if (File.Exists(modelPath) && Path.GetExtension(modelPath).Equals(".pbip", StringComparison.OrdinalIgnoreCase))
            {
                string dir = Path.GetDirectoryName(modelPath) ?? "";
                string nameWithoutExt = Path.GetFileNameWithoutExtension(modelPath);
                semanticModelPath = Path.Combine(dir, $"{nameWithoutExt}.SemanticModel");
            }
            else if (Directory.Exists(modelPath))
            {
                semanticModelPath = modelPath;
            }

            if (string.IsNullOrEmpty(semanticModelPath) || !Directory.Exists(semanticModelPath))
            {
                return string.Empty;
            }

            // Check for definition subfolder (old format)
            string definitionPath = Path.Combine(semanticModelPath, "definition");
            if (Directory.Exists(definitionPath))
            {
                return definitionPath;
            }

            // Return root semantic model folder (new format)
            return semanticModelPath;
        }

    }
}
