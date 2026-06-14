import os
from PIL import Image, ImageDraw

def main():
    print("Generating Electron icon.png...")
    # Create a 64x64 RGBA transparent image
    img = Image.new('RGBA', (64, 64), color=(0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    # Draw double concentric glowing blue circles representing the JARVIS core
    # Outer glow ring
    d.ellipse([4, 4, 60, 60], outline=(0, 225, 255, 120), width=4)
    # Inner glowing core
    d.ellipse([20, 20, 44, 44], fill=(0, 225, 255, 255))
    # Central dot
    d.ellipse([28, 28, 36, 36], fill=(255, 255, 255, 255))
    
    output_path = os.path.join(os.path.dirname(__file__), 'icon.png')
    img.save(output_path)
    print(f"Icon saved successfully at: {output_path}")

    ico_path = os.path.join(os.path.dirname(__file__), 'icon.ico')
    # Save as ICO (supports sizes up to 256x256, but 64x64 is fine)
    img.save(ico_path, format="ICO")
    print(f"Icon saved successfully at: {ico_path}")

if __name__ == '__main__':
    main()
