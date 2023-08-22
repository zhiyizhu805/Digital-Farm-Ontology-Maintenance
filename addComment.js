const fs = require("fs"); // Import the Node.js file system module for reading and writing files
const path = require("path"); // Import the Node.js path module for handling file paths
const xml2js = require("xml2js"); // Import the xml2js module for parsing XML data
const csv = require("csv-parser");

// Define the path of the CSV file
const csvFilePath = path.join(
  __dirname,
  "excelFileToBeAdded",
  "dataItemsFinal.csv"
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
        const objectProperties = result["rdf:RDF"]["owl:Class"];
        objectProperties.forEach((objectProperty) => {
          if (objectProperty["rdfs:subClassOf"]) {
            objectProperty["rdfs:subClassOf"].forEach((subClassOf) => {
              if (subClassOf["$"]["rdf:resource"].includes("DataItem")) {
                // Get the value of 'rdf:about', split it into an array, and return the last element
                const aboutValue = objectProperty["$"]["rdf:about"];
                const className = aboutValue.split("#").pop();
                subClassOfDataItem.push(className);
              }
            });
          }
        });

        const namedIndividualsSubClass = [];
        const namedIndividuals = result["rdf:RDF"]["owl:NamedIndividual"];
        namedIndividuals.forEach((namedIndividual) => {
          if (namedIndividual["rdf:type"]) {
            namedIndividual["rdf:type"].forEach((type) => {
              // Get the 'rdf:resource' value, split it into an array, and return the last element
              const resourceValue = type["$"]["rdf:resource"];
              const typeName = resourceValue.split("#").pop();
              const aboutValue = namedIndividual["$"]["rdf:about"];
              const individualName = aboutValue.split("#").pop();
              // Check if the type is in the list of subclasses of DataItem

              if (subClassOfDataItem.includes(typeName)) {
                namedIndividualsSubClass.push(individualName);
                //if true,find corresponding instance in csv file
                const csvRow = csvData.find(
                  (row) =>
                    row.DataItem.replace("$", "").toLowerCase() ===
                    individualName.replace("$", "").toLowerCase()
                );

                //if there is a corresponding instance in csv file
                if (csvRow) {
                  // Update the 'rdfs:comment' array with the new description
                  console.log("before:", namedIndividual["rdfs:comment"]);
                  namedIndividual["rdfs:comment"] = csvRow.Description;
                  console.log("after:", namedIndividual["rdfs:comment"]);
                }
              }
            });
          }
        });
        // console.log(namedIndividualsSubClass.length);
        // const array = new Set(namedIndividualsSubClass);
        // console.log(array);
        //convert transfromed json version back to rdf
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

// console.log(
//   namedIndividual["rdfs:comment"],
//   "===",
//   csvRow.Description
// );

// Print the namedIndividual
// console.log(namedIndividual);
// console.log(namedIndividuals);
// namedIndividualsSubClass.push(namedIndividual);
// Find the corresponding description in the CSV data
// console.log(individualName.replace("$", "").toLowerCase());

// console.log(namedIndividualsSubClass.length);

// console.log(array);

// // Now, find all the owl:NamedIndividuals and get the value of rdf:type
// const namedIndividualTypes = [];
// const namedIndividuals = result["rdf:RDF"]["owl:NamedIndividual"];
// // console.log(namedIndividuals);
// namedIndividuals.forEach((namedIndividual) => {
//   if (namedIndividual["rdf:type"]) {
//     // console.log(namedIndividual["rdf:type"]);
//     namedIndividual["rdf:type"].forEach((type) => {
//       // Get the 'rdf:resource' value, split it into an array, and return the last element
//       const resourceValue = type["$"]["rdf:resource"];
//       const typeName = resourceValue.split("#").pop();
//       namedIndividualTypes.push(typeName);
//     });
//   }
// });
// console.log(subClassOfDataItem);
// console.log(namedIndividualTypes);

// Now, find all the owl:NamedIndividuals and get the value of rdf:type
