import { APIGatewayProxyHandler } from "aws-lambda"
import { document } from "../utils/dynamodbClient";

export const handler: APIGatewayProxyHandler = async event => {
  const { id } = event.pathParameters

  const response = await document.query({
    TableName: "users_certificate",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ':id': id,
    }
  }).promise()

  const userCertificate = response.Items[0]

  if(!userCertificate) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        error: "Certificado invalido",
      }),
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Certificado valido",
      name: userCertificate.name,
      url:  `https://certifier-juliommen.s3.amazonaws.com/${id}.pdf`
    }),
  }
}