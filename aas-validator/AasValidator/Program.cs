using System;
using System.Text.Json;
using Microsoft.AnalysisServices.AdomdClient;

namespace AasValidator
{
    class Program
    {
        static int Main(string[] args)
        {
            try
            {
                // Parse command-line arguments
                var server = GetArg(args, "--server");
                var database = GetArg(args, "--database");
                var accessToken = GetArg(args, "--token");
                var daxQuery = GetArg(args, "--query", "EVALUATE ROW(\"Test\", 1)");
                var command = GetArg(args, "--command", "query"); // query, validate, getmodel

                // Build connection string with access token
                var connectionString = $"Data Source={server};Initial Catalog={database};";

                using (var connection = new AdomdConnection(connectionString))
                {
                    // Set access token for authentication
                    connection.AccessToken = new Microsoft.AnalysisServices.AccessToken(accessToken, DateTime.MaxValue);
                    connection.Open();

                    switch (command)
                    {
                        case "validate":
                            ValidateDAX(connection, daxQuery);
                            break;
                        case "getmodel":
                            GetModelInfo(connection);
                            break;
                        case "query":
                        default:
                            ExecuteQuery(connection, daxQuery);
                            break;
                    }
                }

                return 0;
            }
            catch (Exception ex)
            {
                var error = new
                {
                    success = false,
                    error = ex.Message,
                    type = ex.GetType().Name
                };
                Console.WriteLine(JsonSerializer.Serialize(error));
                return 1;
            }
        }

        static void ValidateDAX(AdomdConnection connection, string dax)
        {
            try
            {
                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = dax;
                    // Just try to prepare the command - this validates syntax
                    using (var reader = cmd.ExecuteReader())
                    {
                        // Read schema to validate query structure
                        reader.Close();
                    }
                }

                var result = new { success = true, valid = true };
                Console.WriteLine(JsonSerializer.Serialize(result));
            }
            catch (Exception ex)
            {
                var result = new { success = true, valid = false, error = ex.Message };
                Console.WriteLine(JsonSerializer.Serialize(result));
            }
        }

        static void ExecuteQuery(AdomdConnection connection, string dax)
        {
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = dax;
                using (var reader = cmd.ExecuteReader())
                {
                    var rowCount = 0;
                    while (reader.Read())
                    {
                        rowCount++;
                    }

                    var result = new
                    {
                        success = true,
                        rowCount = rowCount,
                        fieldCount = reader.FieldCount
                    };
                    Console.WriteLine(JsonSerializer.Serialize(result));
                }
            }
        }

        static void GetModelInfo(AdomdConnection connection)
        {
            // Query model metadata using DMV
            var tablesQuery = @"
                SELECT [Name], [Description]
                FROM $SYSTEM.TMSCHEMA_TABLES
                WHERE [IsHidden] = FALSE
            ";

            var measuresQuery = @"
                SELECT [Name], [TableID], [Expression]
                FROM $SYSTEM.TMSCHEMA_MEASURES
            ";

            int tableCount = 0;
            int measureCount = 0;

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = tablesQuery;
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read()) tableCount++;
                }
            }

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = measuresQuery;
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read()) measureCount++;
                }
            }

            var result = new
            {
                success = true,
                database = connection.Database,
                tableCount = tableCount,
                measureCount = measureCount
            };
            Console.WriteLine(JsonSerializer.Serialize(result));
        }

        static string GetArg(string[] args, string flag, string defaultValue = null)
        {
            for (int i = 0; i < args.Length - 1; i++)
            {
                if (args[i] == flag)
                    return args[i + 1];
            }

            if (defaultValue != null)
                return defaultValue;

            throw new ArgumentException($"Required argument {flag} not found");
        }
    }
}
