import { Injectable, ConflictException, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

interface SignupParams {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  productKey?: string;
}
interface LoginParams {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
  async signup({ email, password, name, phone }: SignupParams, userType: Role) {
    const ExistingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (ExistingUser) {
      throw new ConflictException('invalid credentails');
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        id: uuid(),
        email,
        password: hashedPassword,
        name,
        phone,
        role: userType,
      },
    });

    return this.generateToken(user.id, user.name);
  }
  async login({ email, password }: LoginParams) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpException('Invalid credentails', 400);
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new HttpException('Invalid credentails', 400);
    }
    return this.generateToken(user.id, user.name);
  }
  private generateToken(id: string, name: string) {
    return jwt.sign({ name, id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });
  }
  genarateProductKey(email: string, userType: Role) {
    const token = `${email}-${userType}-${process.env.PRODUCT_KEY_SECRET}`;
    return bcrypt.hash(token, 10);
  }
}
