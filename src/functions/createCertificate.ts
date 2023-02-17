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
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
    userDataDir: process.env.IS_OFFLINE ? '/dev/null' : undefined
  })

  const page = await browser.newPage()

  await page.setContent(certificate)

  const pdfPage = await page.pdf({
    format:'a4',
    landscape:true,
    printBackground:true,
    preferCSSPageSize:true,
    path: process.env.IS_OFFLINE ? "./certificate.pdf" : null,
  })
  console.log(process.env.IS_OFFLINE)
  await browser.close()

  const s3 = new S3()
  
  await s3.putObject({
    Bucket: "certifier-juliommen",
    Key:`${id}.pdf`,
    ACL:"public-read",
    Body:pdfPage,
    ContentType:'application/pdf'
  }).promise()
  

  return {
    statusCode:201,
    body: JSON.stringify({
      message: 'Certificate created',
      url: `https://certifier-juliommen.s3.amazonaws.com/${id}.pdf`
    }),
  }
}

function compileTemplate(data: Certificate){
  const filePath = join(process.cwd(), "src", "templates", "certificate.hbs")
  const html = readFileSync(filePath, "utf-8")
  return compile(html)(data)
}