const fs = require("fs"); // Import the Node.js file system module for reading and writing files
const path = require("path"); // Import the Node.js path module for handling file paths
const xml2js = require("xml2js"); // Import the xml2js module for parsing XML data
const csv = require("csv-parser");

// Define the path of the CSV file
const csvFilePath = path.join(
  __dirname,
  "excelFileToBeAdded",
  "TaskEffort.csv"
);

// Create an array to store the data parsed from csv file
let csvData = [];

// Create a stream to read the CSV file
fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on("data", (row) => {
    csvData.push(row); // Add the row data to the array
  })
  .on("end", () => {
    // console.log(csvData);
    console.log("CSV file successfully processed");
  });

// Define source folder and target folder path
const sourceDir = path.join(__dirname, "fileToBeFiltered");
const targetDir = path.join(__dirname, "filtered");

// Read all files from the source folder
fs.readdir(sourceDir, (err, files) => {
  if (err) {
    console.error("Could not list the directory.", err);
    process.exit(1); // If there's an error reading the folder, print the error message and exit the program
  }

  // Process each file(Although we only have one file at this stage.Just in case..)
  files.forEach((file, index) => {
    const sourceFilePath = path.join(sourceDir, file); // Full path of the source file
    const targetFilePath = path.join(targetDir, file); // Full path of the target file

    // Read the file
    fs.readFile(sourceFilePath, "utf8", (err, data) => {
      if (err) {
        console.error(`Could not read file ${sourceFilePath}.`, err);
        return; // If there's an error reading the file, print the error message and return (stop further processing)
      }

      // Parse the XML data
      xml2js.parseString(data, (err, result) => {
        if (err) {
          console.error(
            `Could not parse XML data in file ${sourceFilePath}.`,
            err
          );
          return; // If there's an error parsing the XML data, print the error message and return (stop further processing)
        }

        // Get all the class names which have 'subClassOf''DataItem'
        const subClassOfDataItem = [];
        const objectProperties = result["rdf:RDF"]["owl:NamedIndividual"];
        // console.log(objectProperties);
        objectProperties.forEach((objectProperty) => {
          if (objectProperty["Farm-task-ontology:taskName"]) {
            // console.log(objectProperty["Farm-task-ontology:effort"][0]["$"]); //{ 'rdf:datatype': 'http://www.w3.org/2001/XMLSchema#double' }
            // console.log(objectProperty["Farm-task-ontology:effort"][0]["_"]); //1
            // console.log(objectProperty["Farm-task-ontology:effort"]);
            // console.log(objectProperty["Farm-task-ontology:taskName"]);//[ 'Accessing Capital' ]
            const csvRow = csvData.find(
              (row) =>
                row.taskName.replace(" ", "").toLowerCase() ===
                objectProperty["Farm-task-ontology:taskName"][0]
                  .replace(" ", "")
                  .toLowerCase()
            );

            //if there is a corresponding instance in csv file
            if (csvRow.effort) {
              console.log(
                "before:",
                objectProperty["Farm-task-ontology:effort"]
              );
              objectProperty["Farm-task-ontology:effort"] = [
                {
                  _: String(csvRow.effort),
                  $: {
                    "rdf:datatype": "http://www.w3.org/2001/XMLSchema#double",
                  },
                },
              ];
              console.log(
                "after:",
                objectProperty["Farm-task-ontology:effort"]
              );
            }
          }
        });

        // convert transfromed json version back to rdf
        const builder = new xml2js.Builder();
        const xml = builder.buildObject(result);

        fs.writeFile(targetFilePath, xml, (err) => {
          if (err) {
            console.error(`Could not write file ${targetFilePath}.`, err);
            return;
          }

          console.log(`Successfully updated and wrote file ${targetFilePath}.`);
        });
      });
    });
  });
});
