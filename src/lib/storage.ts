import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";

// Cliente S3 apontado pro MinIO. Em produção o MinIO roda num container da
// rede interna (host "minio"), NUNCA exposto à internet — o Next é o único
// que fala com ele. `forcePathStyle` é obrigatório no MinIO (URLs tipo
// host/bucket/objeto).
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
// O comprovante nunca fica acessível publicamente: a leitura é sempre
// intermediada pelo Next (getProofObject), com validação de dono.
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

// Baixa o objeto do MinIO e devolve os bytes + content-type. O Next repassa
// isso pro organizador (stream via rota protegida), em vez de redirecionar pra
// uma URL pré-assinada. Assim o MinIO NUNCA precisa ser exposto à internet —
// o navegador nunca o acessa direto. Comprovante é pequeno (≤5 MB), então
// carregar em memória e repassar é tranquilo.
export async function getProofObject(key: string): Promise<{
  body: Uint8Array;
  contentType?: string;
}> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = await res.Body!.transformToByteArray();
  return { body, contentType: res.ContentType };
}
