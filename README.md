# Serverless Export Outputs

> A Serverless plugin for exporting AWS stack outputs to a file.

By default, this plugin exports all stack outputs to a `.env` file in the root of the project, and formats all keys as `OutputKeyName → REACT_APP_OUTPUT_KEY_NAME`, which allows Create React App to pick them up as `process.env` variables. You can override these in steps 3 and 4 of setup and use it for any other purpose.

## Setup

1. Add dependency to `package.json`:

   ```sh
   npm add -D serverless-export-outputs
   ```

   or

   ```sh
   yarn add -D serverless-export-outputs
   ```

2. Add the plugin to `serverless.yml` file:

   ```yaml
   plugins:
     - serverless-export-outputs
   ```

3. Choose which outputs get exported (optional):

   ```yaml
   custom:
     exportOutputs: # if not provided, all outputs are exported
       - OutputKeyName
       - AnotherOutputKeyName
       - CustomOutput: value # add custom key/value to exports

   Outputs:
     OutputKeyName:
       Value: Lorem ipsum
     AnotherOutputKeyName:
       Value: Lorem ipsum
     ThisOutputWontExport:
       Value: Lorem ipsum
   ```

4. Override defaults (optional):

   ```yaml
   custom:
     exportOutputs:
       include: # if not provided, all outputs are exported
         - OutputKeyName
         - AnotherOutputKeyName
         - CustomOutput: value # add custom key/value to exports
       handler: scripts/env.js # script to process outputs
       output:
         file: ./.env # file path and name relative to root
         format: toml # toml, yaml/yml, json
   ```

   Handler at `scripts/env.js`:

   ```js
   function handler(outputs, serverless, options) {
     console.log({ outputs });
     return outputs;
   }

   module.exports = handler;
   ```

   The handler above overrides/removes prefixing for Create React App.
