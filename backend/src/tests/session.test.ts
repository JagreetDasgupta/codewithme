import request from 'supertest';
import { expect } from 'chai';
import { app } from '../index';
import { UserModel } from '../models/user';
import { SessionModel } from '../models/session';

describe('Session API', () => {
  let token: string;
  let userId: string;
  let sessionId: string;

  const testUser = {
    email: 'session-test@example.com',
    password: 'password123',
    name: 'Session Test User'
  };

  const testSession = {
    title: 'Test Session',
    description: 'This is a test session',
    problem_statement: 'Solve this problem',
    scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60
  };

  before(async () => {
    // Register test user
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    token = res.body.token;
    userId = res.body.data.user.id;
  });

  after(async () => {
    // Clean up test user and sessions
    try {
      const userModel = new UserModel();
      const sessionModel = new SessionModel();
      
      if (sessionId) {
        await sessionModel.delete(sessionId);
      }
      
      await userModel.deleteByEmail(testUser.email);
    } catch (error) {
      console.log('Error in test cleanup:', error);
    }
  });

  describe('POST /api/sessions', () => {
    it('should create a new session', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${token}`)
        .send(testSession);
      
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('status').equal('success');
      expect(res.body.data).to.have.property('session');
      expect(res.body.data.session).to.have.property('title').equal(testSession.title);
      expect(res.body.data.session).to.have.property('created_by').equal(userId);
      
      sessionId = res.body.data.session.id;
    });

    it('should not create a session without authentication', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send(testSession);
      
      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('status').equal('fail');
    });
  });

  describe('GET /api/sessions', () => {
    it('should get all sessions for the user', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('status').equal('success');
      expect(res.body.data).to.have.property('sessions');
      expect(res.body.data.sessions).to.be.an('array');
      expect(res.body.data.sessions.length).to.be.at.least(1);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should get a specific session by ID', async () => {
      const res = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('status').equal('success');
      expect(res.body.data).to.have.property('session');
      expect(res.body.data.session).to.have.property('id').equal(sessionId);
      expect(res.body.data.session).to.have.property('title').equal(testSession.title);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app)
        .get('/api/sessions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).to.equal(404);
      expect(res.body).to.have.property('status').equal('fail');
    });
  });

  describe('PATCH /api/sessions/:id', () => {
    it('should update a session', async () => {
      const updatedTitle = 'Updated Test Session';
      
      const res = await request(app)
        .patch(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: updatedTitle });
      
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('status').equal('success');
      expect(res.body.data).to.have.property('session');
      expect(res.body.data.session).to.have.property('title').equal(updatedTitle);
    });
  });

  describe('POST /api/sessions/:id/participants', () => {
    it('should add a participant to a session', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/participants`)
        .set('Authorization', `Bearer ${token}`)
        .send({ 
          user_id: userId,
          role: 'participant'
        });
      
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('status').equal('success');
      expect(res.body.data).to.have.property('participant');
      expect(res.body.data.participant).to.have.property('user_id').equal(userId);
      expect(res.body.data.participant).to.have.property('role').equal('participant');
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('should delete a session', async () => {
      const res = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).to.equal(204);
      
      // Verify session is deleted
      const checkRes = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(checkRes.status).to.equal(404);
      
      // Clear sessionId since it's been deleted
      sessionId = '';
    });
  });
});