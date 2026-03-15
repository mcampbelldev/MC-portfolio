from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count
from .models import Category, Photo, Project, BlogPost, Tag
from .serializers import CategorySerializer, PhotoSerializer, ProjectSerializer, BlogPostSerializer, TagSerializer

from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from PIL import Image, ImageOps
from io import BytesIO
import os
import secrets

class CategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows categories to be viewed.
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class PhotoViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows photos to be viewed.
    """
    # Las fotos se listan de forma general pero el Frontend puede usarlas según su campo 'is_featured'
    # Y se ordenan prioritariamente por su número de 'order'
    queryset = Photo.objects.all().order_by('order')
    serializer_class = PhotoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class ProjectViewSet(viewsets.ModelViewSet):
    """
    API endpoint para consultar las galerías/proyectos. Trae todas las fotos anidadas automáticamente.
    """
    queryset = Project.objects.filter(is_published=True).order_by('order')
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
class TagViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows tags to be viewed.
    """
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Annotate each tag with its associated number of published blog posts
        # Filter out empty tags and order by post count descending
        return Tag.objects.annotate(
            post_count=Count('posts', filter=Q(posts__is_published=True))
        ).filter(post_count__gt=0).order_by('-post_count', 'name')

class BlogPagination(PageNumberPagination):
    page_size = 6

class BlogPostViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API para consumir el blog
    """
    serializer_class = BlogPostSerializer
    pagination_class = BlogPagination
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = BlogPost.objects.filter(is_published=True).order_by('-published_date')
        
        tag_slug = self.request.query_params.get('tag', None)
        if tag_slug is not None:
            queryset = queryset.filter(tags__slug=tag_slug)

        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) | 
                Q(excerpt__icontains=search_query)
            )

        return queryset

@method_decorator(csrf_exempt, name='dispatch')
class CustomImageUploadView(View):
    """Custom Image Upload view for Editor.js that allows more formats like HEIC"""
    def post(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return JsonResponse({'success': 0, 'message': 'Permission denied'})

        if 'image' in request.FILES:
            the_file = request.FILES['image']
            
            try:
                # Abrir archivo original subido a memoria
                img = Image.open(the_file)
                
                # Respetar la orientación original de Apple/Cámara y limpiar EXIF (GPS, etc)
                img = ImageOps.exif_transpose(img)
                
                # Asegurarnos de que el modo soporte WebP
                if img.mode in ("RGBA", "P"): 
                    img = img.convert("RGB")
                    
                # PROCESAR: Límite 1920px Full HD para que no pesen 10MB
                img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
                
                img_io = BytesIO()
                # Forzar conversión a WEBP con compresión al 85%
                img.save(img_io, format='WEBP', quality=85)
                
                # Generar un nombre seguro e irrepetible para internet
                new_filename = f"{secrets.token_urlsafe(8)}.webp"
                file_path = f"blog/uploads/images/{new_filename}" 
                
                # Escribimos los bytes optimizados al disco en vez del archivo original
                saved_path = default_storage.save(file_path, ContentFile(img_io.getvalue()))
                link = default_storage.url(saved_path)
                
                return JsonResponse({'success': 1, 'file': {"url": link}})
            except Exception as e:
                print(f"Error procesando imagen del blog: {e}")
                return JsonResponse({'success': 0, 'message': 'Error al comprimir la imagen'})
            
        return JsonResponse({'success': 0, 'message': 'No image found'})
