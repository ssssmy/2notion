import JSEncrypt from 'jsencrypt-node';
import { config as CONFIG } from '../../core/config.js';
export const encrypt = (password) => {
    const encryptor = new JSEncrypt();
    encryptor.setPublicKey(CONFIG.publicKey);
    const time = Date.now();
    const symbol = time + ':' + password;
    return encryptor.encrypt(symbol);
};
