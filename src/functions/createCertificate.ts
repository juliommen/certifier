import { APIGatewayProxyHandler } from "aws-lambda";
import { readFileSync } from "fs";
import { join } from "path";
import { document } from "../utils/dynamodbClient";
import {compile} from 'handlebars'
import chromium from 'chrome-aws-lambda'
import {S3} from 'aws-sdk'

interface CertificateRequest {
  id: string,
  name: string,
  grade: string
}

interface Certificate {
  id: string,
  name: string,
  grade: string,
  date:string,
  medal:string
}

export const handler: APIGatewayProxyHandler = async (event)=>{
  const {id, name, grade} = JSON.parse(event.body) as CertificateRequest
  
  const response = await document.query({
    TableName:"users_certificate",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id" : id
    }
  }).promise()

  const userAlreadyExists = response.Items[0]

  if (!userAlreadyExists){
    await document.put({
      TableName:"users_certificate",
      Item: {
        id,
        name,
        grade,
        createdAt: new Date().getTime()
      }
    }).promise()
  }

  const medalPath = join(process.cwd(), "src", "templates", "selo.png")
  const medal = readFileSync(medalPath,"base64")

  const data : Certificate = {
    name,
    id,
    grade,
    date: new Date().toLocaleDateString(),
    medal
  }

  const certificate = compileTemplate(data)

  const browser = await chromium.puppeteer.launch({
    headless: true,
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
  })

  const page = await browser.newPage()

  await page.setContent(certificate)

  const pdfPage = await page.pdf({
    format:'a4',
    landscape:true,
    path: process.env.IS_OFFLINE ? "./certificate.pdf" : null,
    printBackground:true,
    preferCSSPageSize:true,
  })

  await browser.close()

  const s3 = new S3()
  
  await s3.putObject({
    Bucket: process.env.BUCKET_NAME,
    Key:`${id}.pdf`,
    ACL:"public-read",
    Body:pdfPage,
    ContentType:'application/pdf'
  }).promise()
  

  return {
    statusCode:201,
    body: JSON.stringify({
      message: 'Certificate created',
      url: `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${id}.pdf`
    }),
  }
}

function compileTemplate(data: Certificate){
  const filePath = join(process.cwd(), "src", "templates", "certificate.hbs")
  const html = readFileSync(filePath, "utf-8")
  return compile(html)(data)
}