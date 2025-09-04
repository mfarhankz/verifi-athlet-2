declare module '@elasticemail/elasticemail-client' {
  export interface EmailData {
    Recipients: {
      To: string[];
    };
    Content: {
      Body: Array<{
        ContentType: string;
        Content: string;
      }>;
      Subject: string;
      From: string;
    };
  }

  export interface EmailResponse {
    MessageID?: string;
    [key: string]: any;
  }

  export class ElasticEmail {
    constructor(config: { apiKey: string });
    emails: {
      post(data: EmailData): Promise<EmailResponse>;
    };
  }
} 