import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Request,
    UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { LocalAuthGuard } from "../../common/guards/local-auth.guard";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("register")
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @UseGuards(LocalAuthGuard)
    @Post("login")
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto, @Request() req: any) {
        return this.authService.login(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    async refresh(@Request() req: any) {
        return this.authService.refreshToken(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post("logout")
    @HttpCode(HttpStatus.OK)
    async logout() {
        // In a real application, you might want to blacklist the token
        return { message: "Logged out successfully" };
    }
}
