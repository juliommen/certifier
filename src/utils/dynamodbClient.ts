import {DynamoDB} from 'aws-sdk'


const options = {
  region: "us-east-1",
  endpoint:"http://localhost:8000",
  accessKeyId:"xxxx",
  secretAccessKey: "xxxx",
}

const isOffline = () => {
  return process.env.IS_OFFLINE
}


export const document =  isOffline()
  ? new DynamoDB.DocumentClient(options) 
  : new DynamoDB.DocumentClient() 
