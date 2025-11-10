import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

@Injectable()
export class CredentialsService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error(
        'ENCRYPTION_KEY must be set and at least 32 characters long',
      );
    }
    // Derive a 32-byte key from the encryption key
    this.key = scryptSync(encryptionKey, 'salt', 32);
  }

  /**
   * Encrypts AWS credentials
   * @param credentials AWS credentials object
   * @returns Encrypted string in format: iv:authTag:encryptedData
   */
  encrypt(credentials: AwsCredentials): string {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.key, iv);

      const plaintext = JSON.stringify(credentials);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Return as iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new BadRequestException('Failed to encrypt credentials');
    }
  }

  /**
   * Decrypts AWS credentials
   * @param encryptedData Encrypted string in format: iv:authTag:encryptedData
   * @returns Decrypted AWS credentials object
   */
  decrypt(encryptedData: string): AwsCredentials {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      throw new BadRequestException('Failed to decrypt credentials');
    }
  }

  /**
   * Validates AWS credentials format
   */
  validateCredentials(credentials: AwsCredentials): boolean {
    return !!(
      credentials.accessKeyId &&
      credentials.secretAccessKey &&
      credentials.accessKeyId.trim() !== '' &&
      credentials.secretAccessKey.trim() !== ''
    );
  }
}
