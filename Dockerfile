# Official Python 3.11 base image
FROM python:3.11-slim

WORKDIR /app

# Install git (required for pyrogram dev install)
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

# Copy all repository files
COPY . .

# Install requirements (handles both root files and Telegram-Drive-Fixed folder)
RUN if [ -f "Telegram-Drive-Fixed/requirements.txt" ]; then \
      pip install --no-cache-dir -r Telegram-Drive-Fixed/requirements.txt; \
    elif [ -f "requirements.txt" ]; then \
      pip install --no-cache-dir -r requirements.txt; \
    else \
      echo "requirements.txt not found"; exit 1; \
    fi

# Expose Koyeb port
EXPOSE 8000

# Start TG Drive Bot
CMD ["sh", "-c", "if [ -d 'Telegram-Drive-Fixed' ]; then cd Telegram-Drive-Fixed && python3 start_main.py; else python3 start_main.py; fi"]
