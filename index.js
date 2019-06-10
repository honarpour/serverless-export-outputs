const fs = require('fs');
const path = require('path');
const tomlify = require('tomlify-j0.4');
const yamljs = require('yamljs');

const defaultFile = './.env';
const defaultFormat = 'toml';

const camelToSnakeCase = string =>
  string.replace(
    /[A-Z]/g,
    (letter, index) => `${index > 0 ? '_' : ''}${letter}`,
  );

const reactAppHandler = outputs => {
  const processedOutputs = {};

  Object.keys(outputs).forEach(key => {
    const newKey = `REACT_APP_${camelToSnakeCase(key)}`.toUpperCase();
    processedOutputs[newKey] = outputs[key];
  });

  return processedOutputs;
};

class ServerlessExportOutputs {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options || {};
    this.serviceName = serverless.service.getServiceName();
    this.region = serverless.getProvider('aws').getRegion();
    this.stage = serverless.getProvider('aws').getStage();
    if (this.stage.startsWith('$')) this.stage = 'dev';
    this.stackName = `${this.serviceName}-${this.stage}`;
    this.config = serverless.service.custom.exportOutputs;
    this.log = data => serverless.cli.consoleLog(data);

    this.hooks = {
      'after:deploy:deploy': this.export.bind(this),
    };
  }

  getStackOutputs() {
    return this.serverless
      .getProvider('aws')
      .request(
        'CloudFormation',
        'describeStacks',
        { StackName: this.stackName },
        this.stage,
        this.region,
      )
      .then(response => {
        const stack = response.Stacks[0];
        const outputs = stack.Outputs || [];

        return outputs.reduce(
          (allOutputs, output) =>
            Object.assign(allOutputs, {
              [output.OutputKey]: output.OutputValue,
            }),
          {},
        );
      });
  }

  collectOutputs(outputs) {
    if (!this.config) return outputs;

    const isArray = obj =>
      Object.prototype.toString.call(obj) === '[object Array]';
    const isObject = obj =>
      Object.prototype.toString.call(obj) === '[object Object]';

    const targetOutputKeys = isArray(this.config)
      ? this.config
      : this.config.include || [];
    const targetOutputs = {};

    targetOutputKeys.forEach(entry => {
      let key = entry;
      let obj = outputs;
      if (isObject(entry)) {
        key = Object.keys(entry)[0];
        obj = entry;
      }
      targetOutputs[key] = obj[key];
    });

    return targetOutputs;
  }

  processOutputs(outputs) {
    if (this.config && this.config.handler) {
      const handlerPath = path.resolve(
        __dirname,
        `../../${this.config.handler}`,
      );
      const handler = require(handlerPath);
      return handler(outputs, this.serverless, this.options);
    } else if (this.config && this.config.reactapp === true) {
      return reactAppHandler(outputs);
    } else {
      return outputs;
    }
  }

  createFile(outputs) {
    const path =
      this.config && this.config.output && this.config.output.file
        ? this.config.output.file
        : defaultFile;
    const targetFormat =
      this.config && this.config.output && this.config.output.format
        ? this.config.output.format
        : defaultFormat;
    let formattedOutputs = null;

    switch (targetFormat.toLowerCase()) {
      case 'toml':
        formattedOutputs = tomlify.toToml(outputs);
        break;
      case 'yaml':
      case 'yml':
        formattedOutputs = yamljs.stringify(outputs);
        break;
      case 'json':
        formattedOutputs = JSON.stringify(outputs);
        break;
      default:
        throw new Error(`${targetFormat} is not supported`);
    }

    try {
      fs.writeFileSync(path, formattedOutputs);
    } catch (e) {
      throw new Error(`Failed to create file: ${path}`);
    }

    return Promise.resolve();
  }

  export() {
    return this.getStackOutputs()
      .then(stackOutputs => this.collectOutputs(stackOutputs))
      .then(targetOutputs => this.processOutputs(targetOutputs))
      .then(exportOutputs => this.createFile(exportOutputs))
      .catch(error => {
        this.log(error);
      });
  }
}

module.exports = ServerlessExportOutputs;
