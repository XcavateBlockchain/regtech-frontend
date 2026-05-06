export const appEnv = {
  // Root address
  XCAVATE_ADMIN_PRIVATE_KEY: process.env.XCAVATE_ADMIN_PRIVATE_KEY as string,

  PHANTOM_APP_ID: process.env.NEXT_PUBLIC_PHANTOM_APP_ID as string,
  SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL as string,
  SOLANA_WS_URL: process.env.NEXT_PUBLIC_SOLANA_WS_URL as string,
  // USD price of 1 SOL (for UI estimates).
  SOL_USD: process.env.NEXT_PUBLIC_SOL_USD as string,

  XCAV_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION as string,
  AWS_S3_ACCESS_KEY: process.env.XCAV_AWS_S3_ACCESS_KEY as string,
  AWS_S3_SECRET_ACCESS_KEY: process.env.XCAV_AWS_S3_SECRET_ACCESS_KEY as string,
  AWS_S3_BUCKET_NAME: process.env.XCAV_AWS_S3_BUCKET_NAME as string,
  UPLOADED_IMAGE: process.env.NEXT_PUBLIC_UPLOADED_IMAGE as string,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL as string,
  ATTESTORS_FILE: process.env.ATTESTORS_FILE as string,
};
