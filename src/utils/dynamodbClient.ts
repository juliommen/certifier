import {DynamoDB} from 'aws-sdk'


const options = {
  region: "us-east-1",
  endpoint:"http://localhost:8000",
  accessKeyId:"xxxx",
  secretAccessKey: "xxxx",
}

export const document =  process.env.IS_OFFLINE 
  ? new DynamoDB.DocumentClient(options) 
  : new DynamoDB.DocumentClient() 
