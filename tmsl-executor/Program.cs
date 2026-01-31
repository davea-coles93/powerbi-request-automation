using System;
using System.IO;
using Newtonsoft.Json.Linq;
using Microsoft.AnalysisServices.Tabular;

namespace TmslExecutor
{
    class Program
    {
        static int Main(string[] args)
        {
            if (args.Length < 3)
            {
                Console.Error.WriteLine("Usage: TmslExecutor <command> <model-path> <json-data>");
                Console.Error.WriteLine("  Commands:");
                Console.Error.WriteLine("    create-measure <model-path> <measure-json>");
                Console.Error.WriteLine("    update-measure <model-path> <measure-json>");
                Console.Error.WriteLine("    delete-measure <model-path> <measure-json>");
                return 1;
            }

            string command = args[0];
            string modelPath = args[1];
            string jsonData = args[2];

            try
            {
                // Find the semantic model folder
                string semanticModelPath = FindSemanticModelPath(modelPath);
                if (string.IsNullOrEmpty(semanticModelPath))
                {
                    Console.Error.WriteLine($"Error: Could not find semantic model at: {modelPath}");
                    return 1;
                }

                Console.WriteLine($"Loading model from: {semanticModelPath}");

                // Load the model from TMDL files
                var database = TmdlSerializer.DeserializeDatabaseFromFolder(semanticModelPath);
                Console.WriteLine($"Loaded model: {database.Name}");

                // Parse the JSON data
                var data = JObject.Parse(jsonData);

                // Execute the command
                switch (command.ToLower())
                {
                    case "create-measure":
                        CreateMeasure(database, data);
                        break;
                    case "update-measure":
                        UpdateMeasure(database, data);
                        break;
                    case "delete-measure":
                        DeleteMeasure(database, data);
                        break;
                    default:
                        Console.Error.WriteLine($"Error: Unknown command: {command}");
                        return 1;
                }

                // Save the model back to TMDL files
                Console.WriteLine($"Saving model to: {semanticModelPath}");
                TmdlSerializer.SerializeDatabaseToFolder(database, semanticModelPath);

                Console.WriteLine("SUCCESS");
                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error: {ex.Message}");
                Console.Error.WriteLine($"Stack trace: {ex.StackTrace}");
                return 1;
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

        static void CreateMeasure(Database database, JObject data)
        {
            string tableName = data["table"]?.ToString() ?? throw new Exception("Missing 'table' field");
            string measureName = data["name"]?.ToString() ?? throw new Exception("Missing 'name' field");
            string expression = data["expression"]?.ToString() ?? throw new Exception("Missing 'expression' field");
            string? formatString = data["formatString"]?.ToString();
            string? description = data["description"]?.ToString();

            var table = database.Model.Tables.Find(tableName);
            if (table == null)
            {
                throw new Exception($"Table '{tableName}' not found");
            }

            // Check if measure already exists
            if (table.Measures.Find(measureName) != null)
            {
                throw new Exception($"Measure '{measureName}' already exists in table '{tableName}'");
            }

            var measure = new Measure
            {
                Name = measureName,
                Expression = expression
            };

            if (!string.IsNullOrEmpty(formatString))
            {
                measure.FormatString = formatString;
            }

            if (!string.IsNullOrEmpty(description))
            {
                measure.Description = description;
            }

            table.Measures.Add(measure);
            Console.WriteLine($"Created measure: {measureName} in table: {tableName}");
        }

        static void UpdateMeasure(Database database, JObject data)
        {
            string tableName = data["table"]?.ToString() ?? throw new Exception("Missing 'table' field");
            string measureName = data["name"]?.ToString() ?? throw new Exception("Missing 'name' field");
            string? expression = data["expression"]?.ToString();
            string? formatString = data["formatString"]?.ToString();
            string? description = data["description"]?.ToString();

            var table = database.Model.Tables.Find(tableName);
            if (table == null)
            {
                throw new Exception($"Table '{tableName}' not found");
            }

            var measure = table.Measures.Find(measureName);
            if (measure == null)
            {
                throw new Exception($"Measure '{measureName}' not found in table '{tableName}'");
            }

            if (!string.IsNullOrEmpty(expression))
            {
                measure.Expression = expression;
            }

            if (!string.IsNullOrEmpty(formatString))
            {
                measure.FormatString = formatString;
            }

            if (!string.IsNullOrEmpty(description))
            {
                measure.Description = description;
            }

            Console.WriteLine($"Updated measure: {measureName} in table: {tableName}");
        }

        static void DeleteMeasure(Database database, JObject data)
        {
            string tableName = data["table"]?.ToString() ?? throw new Exception("Missing 'table' field");
            string measureName = data["name"]?.ToString() ?? throw new Exception("Missing 'name' field");

            var table = database.Model.Tables.Find(tableName);
            if (table == null)
            {
                throw new Exception($"Table '{tableName}' not found");
            }

            var measure = table.Measures.Find(measureName);
            if (measure == null)
            {
                throw new Exception($"Measure '{measureName}' not found in table '{tableName}'");
            }

            table.Measures.Remove(measure);
            Console.WriteLine($"Deleted measure: {measureName} from table: {tableName}");
        }
    }
}
