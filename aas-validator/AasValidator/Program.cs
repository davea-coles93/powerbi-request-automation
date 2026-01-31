using System;
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
                var accessToken = GetArg(args, "--token");
                var command = GetArg(args, "--command", "query"); // query, validate, getmodel, listdatabases, createtestdb, deletedb, executetmsl

                // Commands that don't require database parameter
                if (command == "listdatabases")
                {
                    ListDatabases(server, accessToken);
                    return 0;
                }

                if (command == "createtestdb")
                {
                    var dbName = GetArg(args, "--database");
                    CreateTestDatabase(server, accessToken, dbName);
                    return 0;
                }

                if (command == "deletedb")
                {
                    var dbName = GetArg(args, "--database");
                    DeleteDatabase(server, accessToken, dbName);
                    return 0;
                }

                if (command == "executetmsl")
                {
                    var tmslFile = GetArg(args, "--file");
                    ExecuteTMSL(server, accessToken, tmslFile);
                    return 0;
                }

                var database = GetArg(args, "--database");
                var daxQuery = GetArg(args, "--query", "EVALUATE ROW(\"Test\", 1)");

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
                Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(error));
                return 1;
            }
        }

        static void ValidateDAX(AdomdConnection connection, string dax)
        {
            try
            {
                // Wrap measure expressions in EVALUATE ROW() to make them queryable
                // If the expression doesn't start with EVALUATE/DEFINE, assume it's a measure
                var query = dax.TrimStart();
                if (!query.StartsWith("EVALUATE", StringComparison.OrdinalIgnoreCase) &&
                    !query.StartsWith("DEFINE", StringComparison.OrdinalIgnoreCase))
                {
                    // Wrap measure expression in EVALUATE ROW()
                    query = $"EVALUATE ROW(\"Result\", {dax})";
                }

                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = query;
                    // Execute the query to validate syntax and semantics
                    using (var reader = cmd.ExecuteReader())
                    {
                        // Read schema to validate query structure
                        reader.Close();
                    }
                }

                var result = new { success = true, valid = true };
                Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(result));
            }
            catch (Exception ex)
            {
                var result = new { success = true, valid = false, error = ex.Message };
                Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(result));
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
                    Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(result));
                }
            }
        }

        static void GetModelInfo(AdomdConnection connection)
        {
            // Query model metadata using DMV (simplified for compatibility)
            var tablesQuery = @"
                SELECT [Name]
                FROM $SYSTEM.TMSCHEMA_TABLES
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
            Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(result));
        }

        static void ListDatabases(string server, string accessToken)
        {
            // Connect without Initial Catalog to list databases
            var connectionString = $"Data Source={server};";

            using (var connection = new AdomdConnection(connectionString))
            {
                connection.AccessToken = new Microsoft.AnalysisServices.AccessToken(accessToken, DateTime.MaxValue);
                connection.Open();

                // Query for databases using DMV
                var query = "SELECT [CATALOG_NAME] FROM $SYSTEM.DBSCHEMA_CATALOGS";

                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = query;
                    using (var reader = cmd.ExecuteReader())
                    {
                        var databases = new System.Collections.Generic.List<string>();
                        while (reader.Read())
                        {
                            databases.Add(reader.GetString(0));
                        }

                        var result = new
                        {
                            success = true,
                            databases = databases.ToArray(),
                            count = databases.Count
                        };
                        Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(result));
                    }
                }
            }
        }

        static void CreateTestDatabase(string server, string accessToken, string databaseName)
        {
            var connectionString = $"Data Source={server};";

            using (var connection = new AdomdConnection(connectionString))
            {
                connection.AccessToken = new Microsoft.AnalysisServices.AccessToken(accessToken, DateTime.MaxValue);
                connection.Open();

                // Create minimal test database using TMSL
                // Use JsonSerializer to avoid manual escaping issues
                var database = new
                {
                    name = databaseName,
                    compatibilityLevel = 1500,
                    model = new
                    {
                        culture = "en-US",
                        tables = new[]
                        {
                            new
                            {
                                name = "TestTable",
                                columns = new[]
                                {
                                    new
                                    {
                                        name = "ID",
                                        dataType = "int64",
                                        sourceColumn = "ID"
                                    }
                                },
                                partitions = new[]
                                {
                                    new
                                    {
                                        name = "Partition",
                                        mode = "import",
                                        source = new
                                        {
                                            type = "m",
                                            expression = "let\n    Source = #table({\"ID\"}, {{1}})\nin\n    Source"
                                        }
                                    }
                                }
                            }
                        },
                        expressions = new object[0]
                    }
                };

                var tmslCommand = new
                {
                    createOrReplace = new
                    {
                        @object = new { database = databaseName },
                        database = database
                    }
                };

                var tmsl = System.Text.Json.JsonSerializer.Serialize(tmslCommand);

                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = tmsl;
                    cmd.ExecuteNonQuery();
                }

                var result = new { success = true, database = databaseName, message = "Test database created" };
                Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(result));
            }
        }

        static void DeleteDatabase(string server, string accessToken, string databaseName)
        {
            var connectionString = $"Data Source={server};";

            using (var connection = new AdomdConnection(connectionString))
            {
                connection.AccessToken = new Microsoft.AnalysisServices.AccessToken(accessToken, DateTime.MaxValue);
                connection.Open();

                // Delete database using TMSL
                var tmsl = $@"{{
                    ""delete"": {{
                        ""object"": {{
                            ""database"": ""{databaseName}""
                        }}
                    }}
                }}";

                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = tmsl;
                    cmd.ExecuteNonQuery();
                }

                var result = new { success = true, database = databaseName, message = "Database deleted" };
                Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(result));
            }
        }

        static void ExecuteTMSL(string server, string accessToken, string tmslFile)
        {
            var connectionString = $"Data Source={server};";

            using (var connection = new AdomdConnection(connectionString))
            {
                connection.AccessToken = new Microsoft.AnalysisServices.AccessToken(accessToken, DateTime.MaxValue);
                connection.Open();

                // Read TMSL from file
                var tmsl = System.IO.File.ReadAllText(tmslFile);

                using (var cmd = connection.CreateCommand())
                {
                    cmd.CommandText = tmsl;
                    cmd.ExecuteNonQuery();
                }

                var result = new { success = true, message = "TMSL executed successfully" };
                Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(result));
            }
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
