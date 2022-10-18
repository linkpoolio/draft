export function checkPrivateKey(): void {
  if (!(process.env.PRIVATE_KEY as string).trim()) {
    throw new Error(`DRAFT tasks on any network different than Hardhat require setting PRIVATE_KEY in the .env file`);
  }
}
