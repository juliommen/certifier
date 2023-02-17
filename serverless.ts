import type { AWS } from '@serverless/typescript';


const serverlessConfiguration: AWS = {
  service: 'certifier',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-dynamodb-local','serverless-offline'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      IS_OFFLINE: '',
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
    },
    iamRoleStatements: [
      {
        Effect: "Allow",
        Action: ["dynamodb:*"],
        Resource: ["*"]
      },
      {
        Effect: "Allow",
        Action: ["s3:*"],
        Resource: ["*"]
      }
    ]
  },
  functions: { 
    createCertificate: {
      handler: "src/functions/createCertificate.handler",
      events: [
        {
          http: {
            path: 'createCertificate',
            method: "post",
            cors:true,
          }
        }
      ]
    },
    verifyCertificate: {
      handler: "src/functions/verifyCertificate.handler",
      events: [
        {
          http: {
            path: 'verifyCertificate/{id}',
            method: "get",
            cors:true,
          }
        }
      ]
    }
  },
  package:{individually:false,include:["./src/templates/**"]},
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
      external: [
        'chrome-aws-lambda'
      ]
    },
    dynamodb: {
      stages: ["dev", "local"],
      start: {
        port: 8000,
        inMemory: true,
        migrate: true
      }
    },
    
  },
  resources: {
    Resources: {
      dbCertificateUsers: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: "users_certificate",
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          } ,
          AttributeDefinitions: [
            {
              AttributeName: "id",
              AttributeType: "S",
            }
          ],
          KeySchema: [ 
            {
              AttributeName: "id",
              KeyType: "HASH"
            }
          ]
        }
      }
    }
  }
};

module.exports = serverlessConfiguration;
