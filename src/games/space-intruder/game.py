import pygame
import random
import sys

# Initialize Pygame
pygame.init()

# Constants
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 100, 255)
YELLOW = (255, 255, 0)
GRAY = (100, 100, 100)
DARK_BLUE = (0, 50, 150)

# Player settings
PLAYER_SPEED = 5
PLAYER_SIZE = 40

# Bullet settings
BULLET_SPEED = 10
BULLET_SIZE = 5

# Enemy settings
ENEMY_SPEED = 3
ENEMY_SIZE = 35
ENEMY_SPAWN_RATE = 60  # Lower = more frequent

class Player:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.width = PLAYER_SIZE
        self.height = PLAYER_SIZE
        self.speed = PLAYER_SPEED
        self.health = 100
        
    def move(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed
        if keys[pygame.K_UP] or keys[pygame.K_w]:
            self.y -= self.speed
        if keys[pygame.K_DOWN] or keys[pygame.K_s]:
            self.y += self.speed
            
        # Keep player on screen
        self.x = max(0, min(self.x, SCREEN_WIDTH - self.width))
        self.y = max(0, min(self.y, SCREEN_HEIGHT - self.height))
    
    def draw(self, screen):
        # Draw fighter jet (triangle shape)
        points = [
            (self.x + self.width // 2, self.y),  # Nose
            (self.x, self.y + self.height),  # Bottom left
            (self.x + self.width, self.y + self.height)  # Bottom right
        ]
        pygame.draw.polygon(screen, BLUE, points)
        # Draw cockpit
        pygame.draw.circle(screen, DARK_BLUE, 
                         (self.x + self.width // 2, self.y + self.height // 3), 
                         self.width // 6)
        # Draw wings
        pygame.draw.polygon(screen, BLUE, [
            (self.x, self.y + self.height // 2),
            (self.x - self.width // 4, self.y + self.height // 2 + 5),
            (self.x, self.y + self.height // 2 + 10)
        ])
        pygame.draw.polygon(screen, BLUE, [
            (self.x + self.width, self.y + self.height // 2),
            (self.x + self.width + self.width // 4, self.y + self.height // 2 + 5),
            (self.x + self.width, self.y + self.height // 2 + 10)
        ])
    
    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

class Bullet:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.width = BULLET_SIZE
        self.height = BULLET_SIZE * 2
        self.speed = BULLET_SPEED
        
    def update(self):
        self.y -= self.speed
        
    def draw(self, screen):
        pygame.draw.rect(screen, YELLOW, (self.x, self.y, self.width, self.height))
        
    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)
    
    def is_off_screen(self):
        return self.y < 0

class Enemy:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.width = ENEMY_SIZE
        self.height = ENEMY_SIZE
        self.speed = ENEMY_SPEED + random.uniform(-1, 1)
        
    def update(self):
        self.y += self.speed
        
    def draw(self, screen):
        # Draw enemy aircraft (inverted triangle)
        points = [
            (self.x + self.width // 2, self.y + self.height),  # Bottom point
            (self.x, self.y),  # Top left
            (self.x + self.width, self.y)  # Top right
        ]
        pygame.draw.polygon(screen, RED, points)
        # Draw enemy body
        pygame.draw.circle(screen, (200, 0, 0), 
                         (self.x + self.width // 2, self.y + self.height // 2), 
                         self.width // 4)
        
    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)
    
    def is_off_screen(self):
        return self.y > SCREEN_HEIGHT

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Fighter Jet Game")
        self.clock = pygame.time.Clock()
        self.font = pygame.font.Font(None, 36)
        self.small_font = pygame.font.Font(None, 24)
        self.reset_game()
        
    def reset_game(self):
        self.player = Player(SCREEN_WIDTH // 2 - PLAYER_SIZE // 2, 
                           SCREEN_HEIGHT - PLAYER_SIZE - 20)
        self.bullets = []
        self.enemies = []
        self.score = 0
        self.game_over = False
        self.frame_count = 0
        
    def handle_input(self):
        keys = pygame.key.get_pressed()
        
        if not self.game_over:
            self.player.move(keys)
            
            # Shooting
            if keys[pygame.K_SPACE]:
                if self.frame_count % 10 == 0:  # Limit fire rate
                    bullet = Bullet(self.player.x + self.player.width // 2 - BULLET_SIZE // 2,
                                  self.player.y)
                    self.bullets.append(bullet)
        
        # Restart game
        if self.game_over and keys[pygame.K_r]:
            self.reset_game()
    
    def spawn_enemy(self):
        if random.randint(1, ENEMY_SPAWN_RATE) == 1:
            x = random.randint(0, SCREEN_WIDTH - ENEMY_SIZE)
            enemy = Enemy(x, -ENEMY_SIZE)
            self.enemies.append(enemy)
    
    def update(self):
        if self.game_over:
            return
            
        self.frame_count += 1
        
        # Spawn enemies
        self.spawn_enemy()
        
        # Update bullets
        for bullet in self.bullets[:]:
            bullet.update()
            if bullet.is_off_screen():
                self.bullets.remove(bullet)
        
        # Update enemies
        for enemy in self.enemies[:]:
            enemy.update()
            if enemy.is_off_screen():
                self.enemies.remove(enemy)
        
        # Check bullet-enemy collisions
        for bullet in self.bullets[:]:
            for enemy in self.enemies[:]:
                if bullet.get_rect().colliderect(enemy.get_rect()):
                    self.bullets.remove(bullet)
                    self.enemies.remove(enemy)
                    self.score += 10
                    break
        
        # Check player-enemy collisions
        for enemy in self.enemies[:]:
            if self.player.get_rect().colliderect(enemy.get_rect()):
                self.game_over = True
                break
    
    def draw(self):
        # Draw sky background (gradient effect)
        for y in range(SCREEN_HEIGHT):
            color_ratio = y / SCREEN_HEIGHT
            color = (
                int(135 + color_ratio * 120),  # R: 135 to 255
                int(206 + color_ratio * 49),   # G: 206 to 255
                int(250 - color_ratio * 50)    # B: 250 to 200
            )
            pygame.draw.line(self.screen, color, (0, y), (SCREEN_WIDTH, y))
        
        # Draw clouds (simple circles)
        for i in range(3):
            cloud_x = (self.frame_count // 2 + i * 300) % (SCREEN_WIDTH + 200) - 100
            cloud_y = 50 + i * 150
            for j in range(3):
                pygame.draw.circle(self.screen, WHITE, 
                                 (cloud_x + j * 30, cloud_y), 20, 2)
        
        # Draw game objects
        self.player.draw(self.screen)
        
        for bullet in self.bullets:
            bullet.draw(self.screen)
            
        for enemy in self.enemies:
            enemy.draw(self.screen)
        
        # Draw UI
        score_text = self.font.render(f"Score: {self.score}", True, WHITE)
        self.screen.blit(score_text, (10, 10))
        
        health_text = self.small_font.render(f"Health: {self.player.health}%", True, WHITE)
        self.screen.blit(health_text, (10, 50))
        
        # Draw controls hint
        if self.frame_count < 180:  # Show for 3 seconds
            controls_text = self.small_font.render(
                "WASD/Arrows: Move | SPACE: Shoot", True, WHITE
            )
            text_rect = controls_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 30))
            # Draw background for text
            pygame.draw.rect(self.screen, BLACK, 
                          (text_rect.x - 5, text_rect.y - 5, 
                           text_rect.width + 10, text_rect.height + 10))
            self.screen.blit(controls_text, text_rect)
        
        # Draw game over screen
        if self.game_over:
            overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
            overlay.set_alpha(180)
            overlay.fill(BLACK)
            self.screen.blit(overlay, (0, 0))
            
            game_over_text = self.font.render("GAME OVER", True, RED)
            score_final_text = self.font.render(f"Final Score: {self.score}", True, WHITE)
            restart_text = self.small_font.render("Press R to Restart", True, WHITE)
            
            game_over_rect = game_over_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 60))
            score_rect = score_final_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 20))
            restart_rect = restart_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 20))
            
            self.screen.blit(game_over_text, game_over_rect)
            self.screen.blit(score_final_text, score_rect)
            self.screen.blit(restart_text, restart_rect)
        
        pygame.display.flip()
    
    def run(self):
        running = True
        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
            
            self.handle_input()
            self.update()
            self.draw()
            self.clock.tick(FPS)
        
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    game = Game()
    game.run()

