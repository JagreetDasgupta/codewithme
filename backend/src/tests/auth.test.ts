import request from 'supertest';
import { expect } from 'chai';
import { app } from '../index';
import { UserModel } from '../models/user';

describe('Authentication API', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
  };

  before(async () => {
    // Clean up test user if exists
    try {
      const userModel = new UserModel();
      await userModel.deleteByEmail(testUser.email);
    } catch (error) {
      console.log('Error in test setup:', error);
    }
  });

  after(async () => {
    // Clean up test user
    try {
      const userModel = new UserModel();
      await userModel.deleteByEmail(testUser.email);
    } catch (error) {
      console.log('Error in test cleanup:', error);
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('status').equal('success');
      expect(res.body).to.have.property('token');
      expect(res.body.data).to.have.property('user');
      expect(res.body.data.user).to.have.property('email').equal(testUser.email);
      expect(res.body.data.user).to.have.property('name').equal(testUser.name);
      expect(res.body.data.user).to.not.have.property('password');
    });

    it('should not register a user with existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('status').equal('fail');
      expect(res.body).to.have.property('message').contains('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('status').equal('success');
      expect(res.body).to.have.property('token');
      expect(res.body.data).to.have.property('user');
      expect(res.body.data.user).to.have.property('email').equal(testUser.email);
    });

    it('should not login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });
      
      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('status').equal('fail');
      expect(res.body).to.have.property('message').contains('Incorrect email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    before(async () => {
      // Login to get token
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      token = res.body.token;
    });

    it('should get current user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('status').equal('success');
      expect(res.body.data).to.have.property('user');
      expect(res.body.data.user).to.have.property('email').equal(testUser.email);
    });

    it('should not get profile without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');
      
      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('status').equal('fail');
      expect(res.body).to.have.property('message').contains('not logged in');
    });
  });
});