import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, string> = new Map(); // socketId -> userId

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token = client.handshake.auth.token;

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;

      // Store client connection
      this.connectedClients.set(client.id, userId);

      console.log(`Client connected: ${client.id} (User: ${userId})`);

      // Join user-specific room
      client.join(`user:${userId}`);

      // Send connection confirmation
      client.emit('connected', { message: 'Connected to notification server' });
    } catch (error) {
      console.error('Authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedClients.get(client.id);
    console.log(`Client disconnected: ${client.id} (User: ${userId})`);
    this.connectedClients.delete(client.id);
  }

  // Broadcast to all connected clients
  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Send to specific user
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Notify about new study
  notifyNewStudy(userId: string, study: any) {
    this.sendToUser(userId, 'study:new', {
      type: 'study:new',
      data: study,
      timestamp: new Date().toISOString(),
    });
  }

  // Notify about study update
  notifyStudyUpdate(userId: string, study: any) {
    this.sendToUser(userId, 'study:update', {
      type: 'study:update',
      data: study,
      timestamp: new Date().toISOString(),
    });
  }

  // Notify about source status change
  notifySourceStatusChange(data: any) {
    this.broadcastToAll('source:status', {
      type: 'source:status',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Generic notification
  sendNotification(userId: string, notification: any) {
    this.sendToUser(userId, 'notification', {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString(),
    });
  }
}
