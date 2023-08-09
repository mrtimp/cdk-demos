import {
    Callback,
    CloudFrontResponseEvent,
    CloudFrontResponseHandler,
    CloudFrontResultResponse,
    Context
} from 'aws-lambda';

export const handler: CloudFrontResponseHandler = (
    event: CloudFrontResponseEvent,
    _: Context,
    callback: Callback<CloudFrontResultResponse>
) => {
    const response = event.Records[0].cf.response;

    if (response.status == '403') {
        let html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Forbidden</title>
        <style>
            @import url('https://fonts.googleapis.com/css?family=Press+Start+2P');

            html,body {
               width: 100%;
               height: 100%;
               margin: 0;
            }

            * {
               font-family: 'Press Start 2P', cursive;
               box-sizing: border-box;
            }

            #app {
               padding: 1rem;
               background: black;
               display: flex;
               height: 100%;
               justify-content: center;
               align-items: center;
               color: #54FE55;
               text-shadow: 0 0 10px;
               font-size: 6rem;
               flex-direction: column;
               .txt {
                  font-size: 1.8rem;
               }
            }

            @keyframes blink {
                0%   {opacity: 0}
                49%  {opacity: 0}
                50%  {opacity: 1}
                100% {opacity: 1}
            }

            .blink {
               animation-name: blink;
                animation-duration: 1s;
               animation-iteration-count: infinite;
            }
        </style>
    </head>
    <body>
        <div id="app">
            <div>403</div>
                <div class="txt">Forbidden<span class="blink">_</span>
            </div>
        </div>
    </body>
    </html>`;

        response.status = '403';
        response.headers['content-type'] = [{ value: 'text/html;charset=UTF-8' }];
        response.headers['cache-control'] = [{ key: "Cache-Control", value: "no-cache" }];
        // @ts-ignore
        response.body = html;
    }

    return callback(null, response);
};
