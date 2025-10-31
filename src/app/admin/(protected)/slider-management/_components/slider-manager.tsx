
'use client';

import { useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addSliderImage, updateSliderImage, deleteSliderImage, getSliderImages } from '../actions';
import type { SliderImage } from '@/lib/definitions';
import { Loader2, PlusCircle, Trash2, Edit, Save, X, Image as ImageIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AdminSliderMedia from './admin-slider-media';


interface SliderManagerProps {
    initialImages: SliderImage[];
}

export default function SliderManager({ initialImages }: SliderManagerProps) {
    const [images, setImages] = useState<SliderImage[]>(initialImages);
    const [editingImage, setEditingImage] = useState<SliderImage | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const addFormRef = useRef<HTMLFormElement>(null);
    const editFormRef = useRef<HTMLFormElement>(null);

    const handleAddImage = async (formData: FormData) => {
        startTransition(async () => {
            const result = await addSliderImage(formData);
            if (result.success) {
                toast({ title: 'Success', description: result.message });
                addFormRef.current?.reset();
                const updatedImages = await getSliderImages();
                setImages(updatedImages);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    const handleUpdateImage = async (formData: FormData) => {
        if (!editingImage) return;
        startTransition(async () => {
            const result = await updateSliderImage(editingImage._id.toString(), formData);
            if (result.success) {
                toast({ title: 'Success', description: result.message });
                setEditingImage(null);
                const updatedImages = await getSliderImages();
                setImages(updatedImages);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    }

    const handleDeleteImage = async (imageId: string) => {
        startTransition(async () => {
            const result = await deleteSliderImage(imageId);
            if (result.success) {
                toast({ title: 'Success', description: result.message });
                setImages(prev => prev.filter(img => img._id.toString() !== imageId));
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PlusCircle /> Add New Slider Image</CardTitle>
                    <CardDescription>Add a new image to the homepage carousel.</CardDescription>
                </CardHeader>
                <form ref={addFormRef} action={handleAddImage}>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="imageUrl">Image URL</Label>
                                <Input id="imageUrl" name="imageUrl" required placeholder="https://example.com/image.png" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="displayOrder">Display Order</Label>
                                <Input id="displayOrder" name="displayOrder" type="number" required placeholder="e.g., 1" min="1" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Image
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ImageIcon /> Current Slider Images</CardTitle>
                    <CardDescription>Manage existing images in the slider. Lower numbers appear first.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {images.length > 0 ? (
                        images.map(image => (
                            <div key={image._id.toString()} className="border p-4 rounded-lg">
                                {editingImage?._id.toString() === image._id.toString() ? (
                                    <form ref={editFormRef} action={handleUpdateImage} className="space-y-4">
                                        <div className="flex items-center gap-4">
                                             <div className="relative w-32 h-16 rounded-md overflow-hidden shrink-0">
                                                <AdminSliderMedia src={image.imageUrl} alt="Slider image" />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
                                                <div className="md:col-span-2 space-y-2">
                                                    <Label htmlFor={`edit-imageUrl-${image._id}`}>Image URL</Label>
                                                    <Input id={`edit-imageUrl-${image._id}`} name="imageUrl" defaultValue={image.imageUrl} required />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor={`edit-displayOrder-${image._id}`}>Order</Label>
                                                    <Input id={`edit-displayOrder-${image._id}`} name="displayOrder" type="number" defaultValue={image.displayOrder} required min="1" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingImage(null)}><X className="mr-2"/>Cancel</Button>
                                            <Button type="submit" size="sm" disabled={isPending}><Save className="mr-2"/>Save</Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-32 h-16 rounded-md overflow-hidden shrink-0">
                                                <AdminSliderMedia src={image.imageUrl} alt="Slider image" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-primary truncate text-sm">Order: {image.displayOrder}</p>
                                                <p className="text-xs text-muted-foreground truncate">{image.imageUrl}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            <Button variant="outline" size="icon" onClick={() => setEditingImage(image)}><Edit className="h-4 w-4" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="icon" disabled={isPending}><Trash2 className="h-4 w-4" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will permanently delete this image from the slider.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteImage(image._id.toString())}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No slider images have been added yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
