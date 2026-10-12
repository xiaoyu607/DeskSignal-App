function verifyMacSignature(metadata, team) {
  if (!metadata.includes('Authority=Developer ID Application:') ||
      !metadata.split(/\r?\n/).includes(`TeamIdentifier=${team}`) ||
      !/\bflags=0x[0-9a-f]+\([^\n)]*\bruntime\b[^\n)]*\)/i.test(metadata) || !/^Timestamp=.+/m.test(metadata)) {
    throw new Error('Expected timestamped Developer ID signature with hardened runtime and matching Team ID');
  }
}

function acceptedReceipt(json) {
  const receipt = JSON.parse(json);
  if (receipt.status !== 'Accepted' || !receipt.id) throw new Error('Apple did not accept the disk image; refusing to release it');
  return receipt;
}

module.exports = { verifyMacSignature, acceptedReceipt };
