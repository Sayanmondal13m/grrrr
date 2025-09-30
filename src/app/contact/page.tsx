import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="bg-background">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-6 text-center">
            Contact Us
          </h1>
          <p className="text-lg text-muted-foreground mb-12 text-center">
            We're here to help. Reach out to us with any questions or concerns.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="font-headline mt-4">Email Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">For any support queries, please email us. We aim to respond within 24 hours.</p>
                <a href="mailto:garenaffmaxstore@gmail.com" className="text-primary font-semibold text-lg mt-2 inline-block hover:underline">
                  garenaffmaxstore@gmail.com
                </a>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="font-headline mt-4">Headquarters</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">While we primarily offer digital services, you can find our corporate office here.</p>
                <p className="font-semibold text-lg mt-2">
                  Garena, Singapore
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
