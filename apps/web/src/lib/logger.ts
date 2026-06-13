import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";
import path from "path";

class Logger {
  private static instance: winston.Logger;

  static {
    const logsDir = path.resolve(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    winston.addColors({
      error: "red bold",
      warn: "yellow bold",
      info: "blue bold",
      http: "magenta",
      debug: "gray",
      verbose: "cyan",
    });

    const isProduction = process.env.NODE_ENV === "production";

    // Shared log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : "";
        return stack
          ? `[${timestamp}] ${level}: ${message}${metaStr}\n${stack}`
          : `[${timestamp}] ${level}: ${message}${metaStr}`;
      })
    );

    // JSON format for production log files (easier to search/parse)
    const jsonFormat = winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    const fileFormat = isProduction ? jsonFormat : logFormat;

    this.instance = winston.createLogger({
      level: isProduction ? "info" : "debug",
      format: fileFormat,
      transports: [
        // Error logs — keep for 30 days
        new DailyRotateFile({
          filename: path.join(logsDir, "error-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          level: "error",
          maxSize: "20m",
          maxFiles: "30d",
        }),
        // HTTP request logs — separate file, keep for 14 days
        new DailyRotateFile({
          filename: path.join(logsDir, "http-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          level: "http",
          maxSize: "20m",
          maxFiles: "14d",
        }),
        // Combined logs — keep for 14 days
        new DailyRotateFile({
          filename: path.join(logsDir, "combined-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          maxSize: "20m",
          maxFiles: "14d",
        }),
      ],
    });

    // Console transport with colors
    this.instance.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.printf(({ level, message, timestamp }) => {
            return `[${timestamp}] ${level}: ${message}`;
          })
        ),
      })
    );
  }

  static info(message: string, meta?: Record<string, unknown>) {
    this.instance.info(message, meta);
  }

  static error(message: string, error?: unknown) {
    if (error instanceof Error) {
      this.instance.error(message, { stack: error.stack, name: error.name });
    } else {
      this.instance.error(message, { error });
    }
  }

  static warn(message: string, meta?: Record<string, unknown>) {
    this.instance.warn(message, meta);
  }

  static debug(message: string, meta?: Record<string, unknown>) {
    this.instance.debug(message, meta);
  }

  static http(message: string, meta?: Record<string, unknown>) {
    this.instance.http(message, meta);
  }

  /**
   * Log an HTTP request with method, URL, status, and response time.
   */
  static logRequest(method: string, url: string, statusCode: number, durationMs: number, ip?: string) {
    const message = `${method} ${url} ${statusCode} ${durationMs}ms${ip ? ` - ${ip}` : ""}`;
    this.instance.http(message, { method, url, statusCode, durationMs, ip });
  }
}

export default Logger;