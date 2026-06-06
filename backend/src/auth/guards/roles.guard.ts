import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

// гуард для проверки роли пользователя
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // получаем список разрешенных ролей из декоратора
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // если роли не указаны - пропускаем всех
    if (!roles || roles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<any>();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Insufficient role');
    }

    if (!user.role) {
      throw new ForbiddenException('Insufficient role');
    }

    // проверяем есть ли роль пользователя в списке разрешенных
    let hasRole = false;
    for (let i = 0; i < roles.length; i++) {
      if (roles[i] === user.role) {
        hasRole = true;
        break;
      }
    }

    if (hasRole === false) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
