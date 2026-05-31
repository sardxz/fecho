import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cliente S3 apontado pro MinIO (Fase 5). Em produção o mesmo código serve
// pra qualquer storage S3-compat — só muda o endpoint nas envs.
// `forcePathStyle` é obrigatório no MinIO (URLs tipo host/bucket/objeto).
const endpoint = process.env.S3_ENDPOINT;
const bucket = process.env.S3_BUCKET_NAME ?? "proofs";

const s3 = new S3Client({
  endpoint,
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

// Garante que o bucket existe. Idempotente: ignora "já existe". Em dev evita
// ter que criar o bucket na mão no console do MinIO. Chamado antes do upload.
let bucketReady = false;
async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (err) {
      // Corrida entre requests pode resultar em "já existe" — tudo bem.
      const name = (err as { name?: string })?.name;
      if (name !== "BucketAlreadyOwnedByYou" && name !== "BucketAlreadyExists") {
        throw err;
      }
    }
  }
  bucketReady = true;
}

// Sobe um comprovante e devolve a CHAVE do objeto (não uma URL pública).
// O comprovante nunca fica acessível publicamente: a leitura é só por URL
// pré-assinada temporária (getProofUrl), gerada pro organizador na revisão.
export async function uploadProof(
  body: Buffer,
  contentType: string,
  key: string,
): Promise<string> {
  await ensureBucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

// URL pré-assinada de leitura, válida por `expiresIn` segundos (padrão 5 min).
// Usada na Etapa 5 quando o organizador for revisar o comprovante.
export async function getProofUrl(
  key: string,
  expiresIn = 300,
): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn,
  });
}
