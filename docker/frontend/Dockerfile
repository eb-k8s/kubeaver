FROM nginx:1.25.2-alpine

COPY dist/ /usr/share/nginx/html/
# COPY nginx.conf /etc/nginx/
CMD ["nginx", "-g", "daemon off;"]